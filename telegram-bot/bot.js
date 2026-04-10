import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_USER_ID = process.env.TELEGRAM_USER_ID;
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:5001';

let bot = null;
const pendingVoiceEdits = new Map();
const pendingImageGroups = new Map();
const pendingOverwrites = new Map();
const IMAGE_GROUP_TIMEOUT = 2000;

async function sendConflictPrompt(chatId, recipe, statusMsgId) {
  pendingOverwrites.set(chatId, { recipe, statusMsgId });
  await bot.editMessageText(`⚠️ *La receta ya existe*\n\n"${recipe.title_es}" ya está publicada.\n\n¿Deseas actualizarla con los nuevos datos?`, {
    chat_id: chatId,
    message_id: statusMsgId,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔄 Sí, actualizar', callback_data: 'overwrite_confirm' },
          { text: '❌ No, cancelar', callback_data: 'overwrite_cancel' }
        ]
      ]
    }
  });
}

function isAuthorized(userId) {
  return userId.toString() === ALLOWED_USER_ID;
}

function buildInlineKeyboard(recipeSlug) {
  return {
    inline_keyboard: [
      [
        { text: '💾 Guardar en la base de datos', callback_data: `action:post:${recipeSlug}` },
        { text: '📄 CSV', callback_data: `action:csv:${recipeSlug}` }
      ],
      [
        { text: '🛠️ Postman/cURL', callback_data: `action:curl:${recipeSlug}` }
      ]
    ]
  };
}

function formatRecipeSummary(recipe) {
  const alerts = recipe.sibo_alerts?.length > 0
    ? `\n\n⚠️ *Alertas SIBO:*\n${recipe.sibo_alerts.map(a => `• ${a}`).join('\n')}`
    : '';

  return `✅ *Receta procesada*\n\n` +
    `📝 *${recipe.title_es}*\n` +
    `🇬🇧 ${recipe.title_en}\n\n` +
    `⏱️ Prep: ${recipe.prep_time_minutes}min | Cocción: ${recipe.cook_time_minutes}min\n` +
    `👥 Porciones: ${recipe.servings} | Dificultad: ${recipe.difficulty}\n` +
    `🦠 Riesgo SIBO: *${recipe.sibo_risk_level.toUpperCase()}*${alerts}\n` +
    `🏷️ Tags: ${(recipe.tags || []).join(', ') || 'Ninguno'}\n\n` +
    `Elige una acción:`;
}

async function processImage(msg) {
  const chatId = msg.chat.id;

  if (!pendingImageGroups.has(chatId)) {
    pendingImageGroups.set(chatId, { images: [], timer: null });
  }

  const group = pendingImageGroups.get(chatId);
  const fileId = msg.photo[msg.photo.length - 1].file_id;
  group.images.push(fileId);

  if (group.timer) clearTimeout(group.timer);

  if (group.images.length === 1) {
    const statusMsg = await bot.sendMessage(chatId, '📸 Recibida imagen 1. Esperando 2s por una segunda imagen...');
    group.statusMsg = statusMsg;
  }

  group.timer = setTimeout(async () => {
    const currentGroup = pendingImageGroups.get(chatId);
    if (!currentGroup) return;
    pendingImageGroups.delete(chatId);

    if (currentGroup.images.length === 1) {
      processSingleImage(chatId, currentGroup.images[0], currentGroup.statusMsg?.message_id);
    } else if (currentGroup.images.length === 2) {
      processImageGroup(chatId, currentGroup.images, currentGroup.statusMsg?.message_id);
    } else if (currentGroup.images.length > 2) {
      const lastTwo = currentGroup.images.slice(-2);
      processImageGroup(chatId, lastTwo, currentGroup.statusMsg?.message_id);
    }
  }, IMAGE_GROUP_TIMEOUT);
}

async function processSingleImage(chatId, fileId, statusMsgId) {
  try {
    const fileLink = await bot.getFileLink(fileId);
    const imageUrl = typeof fileLink === 'string' ? fileLink : fileLink?.href || fileLink?.toString();

    if (!statusMsgId) {
      statusMsgId = (await bot.sendMessage(chatId, '🔍 Extrayendo texto de la imagen con OCDRNet...')).message_id;
    } else {
      await bot.editMessageText('🔍 Extrayendo texto de la imagen con OCDRNet...', {
        chat_id: chatId,
        message_id: statusMsgId
      });
    }

    const res = await fetch(`${BACKEND_URL}/api/ingest/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl })
    });

    const data = await res.json();

    if (res.status === 409 && data.conflict) {
      await sendConflictPrompt(chatId, data.recipe, statusMsgId);
      return;
    }

    if (!res.ok) {
      await bot.editMessageText(`❌ Error: ${data.error}`, {
        chat_id: chatId,
        message_id: statusMsgId
      });
      return;
    }

    const recipe = data.recipe;
    await bot.editMessageText(formatRecipeSummary(recipe), {
      chat_id: chatId,
      message_id: statusMsgId,
      parse_mode: 'Markdown',
      reply_markup: buildInlineKeyboard(recipe.slug)
    });

  } catch (error) {
    console.error('[TelegramBot] Error processing single image:', error);
    bot.sendMessage(chatId, `❌ Error procesando la imagen: ${error.message}`);
  }
}

async function processImageGroup(chatId, fileIds, statusMsgId) {
  try {
    if (!statusMsgId) {
      statusMsgId = (await bot.sendMessage(chatId, '🔍 Extrayendo texto de ambas imágenes...')).message_id;
    } else {
      await bot.editMessageText('🔍 Extrayendo texto de ambas imágenes...', {
        chat_id: chatId,
        message_id: statusMsgId
      });
    }

    const fileLinks = await Promise.all(fileIds.map(fid => bot.getFileLink(fid)));
    const imageUrl1 = typeof fileLinks[0] === 'string' ? fileLinks[0] : fileLinks[0]?.href || fileLinks[0]?.toString();
    const imageUrl2 = typeof fileLinks[1] === 'string' ? fileLinks[1] : fileLinks[1]?.href || fileLinks[1]?.toString();

    const res = await fetch(`${BACKEND_URL}/api/ingest/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl1, imageUrl2 })
    });

    const data = await res.json();

    if (res.status === 409 && data.conflict) {
      await sendConflictPrompt(chatId, data.recipe, statusMsgId);
      return;
    }

    if (!res.ok) {
      await bot.editMessageText(`❌ Error: ${data.error}`, {
        chat_id: chatId,
        message_id: statusMsgId
      });
      return;
    }

    const recipe = data.recipe;
    await bot.editMessageText(formatRecipeSummary(recipe), {
      chat_id: chatId,
      message_id: statusMsgId,
      parse_mode: 'Markdown',
      reply_markup: buildInlineKeyboard(recipe.slug)
    });

  } catch (error) {
    console.error('[TelegramBot] Error processing image group:', error);
    bot.sendMessage(chatId, `❌ Error procesando las imágenes: ${error.message}`);
  }
}

async function processText(msg) {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text.startsWith('/')) return;

  try {
    const processingMsg = await bot.sendMessage(chatId, '🧠 Analizando receta con Llama 4 Maverick...');

    const res = await fetch(`${BACKEND_URL}/api/ingest/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sourceType: 'telegram' })
    });

    const data = await res.json();

    if (res.status === 409 && data.conflict) {
      await sendConflictPrompt(chatId, data.recipe, processingMsg.message_id);
      return;
    }

    if (!res.ok) {
      await bot.editMessageText(`❌ Error: ${data.error}`, {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });
      return;
    }

    const recipe = data.recipe;
    await bot.editMessageText(formatRecipeSummary(recipe), {
      chat_id: chatId,
      message_id: processingMsg.message_id,
      parse_mode: 'Markdown',
      reply_markup: buildInlineKeyboard(recipe.slug)
    });

  } catch (error) {
    console.error('[TelegramBot] Error processing text:', error);
    bot.sendMessage(chatId, `❌ Error procesando el texto: ${error.message}`);
  }
}

async function processVoice(msg) {
  const chatId = msg.chat.id;

  try {
    const processingMsg = await bot.sendMessage(chatId, '🎤 Transcribiendo audio con Groq Whisper...');

    const fileId = msg.voice.file_id;
    const fileLink = await bot.getFileLink(fileId);
    const audioUrl = typeof fileLink === 'string' ? fileLink : fileLink?.href || fileLink?.toString();

    const res = await fetch(`${BACKEND_URL}/api/ingest/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioUrl, language: 'es' })
    });

    const data = await res.json();

    if (!res.ok) {
      await bot.editMessageText(`❌ Error: ${data.error}`, {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });
      return;
    }

    const transcribedText = data.transcribedText;

    pendingVoiceEdits.set(chatId, {
      audioUrl,
      transcribedText,
      messageId: processingMsg.message_id
    });

    await bot.editMessageText(
      `🎙️ *Texto transcrito:*\n\n` +
      `\`\`\`\n${transcribedText}\n\`\`\`\n\n` +
      `¿El texto es correcto?`,
      {
        chat_id: chatId,
        message_id: processingMsg.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Confirmar y procesar', callback_data: 'voice_confirm' },
              { text: '✏️ Editar texto', callback_data: 'voice_edit' }
            ],
            [
              { text: '🗑️ No procesar', callback_data: 'voice_discard' }
            ]
          ]
        }
      }
    );

  } catch (error) {
    console.error('[TelegramBot] Error processing voice:', error);
    bot.sendMessage(chatId, `❌ Error procesando el audio: ${error.message}`);
  }
}

async function confirmVoiceRecipe(chatId) {
  const pending = pendingVoiceEdits.get(chatId);
  if (!pending) {
    return bot.sendMessage(chatId, '❌ No hay audio pendiente. Envía otro audio.');
  }

  try {
    const processingMsg = await bot.sendMessage(chatId, '🧠 Analizando receta con Llama 4 Maverick...');

    const textToProcess = pending.transcribedText;

    const res = await fetch(`${BACKEND_URL}/api/ingest/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textToProcess, sourceType: 'audio' })
    });

    const data = await res.json();

    if (res.status === 409 && data.conflict) {
      await sendConflictPrompt(chatId, data.recipe, processingMsg.message_id);
      pendingVoiceEdits.delete(chatId);
      return;
    }

    if (!res.ok) {
      await bot.editMessageText(`❌ Error: ${data.error}`, {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });
      return;
    }

    const recipe = data.recipe;

    await bot.editMessageText(formatRecipeSummary(recipe), {
      chat_id: chatId,
      message_id: processingMsg.message_id,
      parse_mode: 'Markdown',
      reply_markup: buildInlineKeyboard(recipe.slug)
    });

    pendingVoiceEdits.delete(chatId);

  } catch (error) {
    console.error('[TelegramBot] Error confirming voice:', error);
    bot.sendMessage(chatId, `❌ Error procesando la receta: ${error.message}`);
  }
}

async function requestVoiceEdit(chatId) {
  pendingVoiceEdits.set(chatId, { ...(pendingVoiceEdits.get(chatId)), awaitingEdit: true });

  await bot.sendMessage(chatId,
    '✏️ Enviame el texto corregido. Podés editar todo lo que necesites.',
    { parse_mode: 'Markdown' }
  );
}

async function handleEditedVoiceText(msg) {
  const chatId = msg.chat.id;
  const pending = pendingVoiceEdits.get(chatId);

  if (!pending || !pending.awaitingEdit) return false;

  const newText = msg.text;

  pendingVoiceEdits.set(chatId, {
    ...pending,
    transcribedText: newText,
    awaitingEdit: false
  });

  const statusMsg = await bot.sendMessage(chatId,
    `📝 *Texto actualizado:*\n\n` +
    `\`\`\`\n${newText}\n\`\`\`\n\n` +
    `¿Ahora sí?`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Confirmar y procesar', callback_data: 'voice_confirm' },
            { text: '✏️ Seguir editando', callback_data: 'voice_edit' }
          ],
          [
            { text: '🗑️ No procesar', callback_data: 'voice_discard' }
          ]
        ]
      }
    }
  );

  pendingVoiceEdits.set(chatId, { ...pending, transcribedText: newText, awaitingEdit: false, editMessageId: statusMsg.message_id });

  return true;
}

function buildCSVRow(recipe) {
  const headers = [
    'slug', 'title_es', 'title_en', 'prep_time_minutes', 'cook_time_minutes',
    'servings', 'difficulty', 'sibo_risk_level', 'sibo_alerts', 'ingredients_count', 'steps_count'
  ];

  const escapeCsv = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const row = [
    recipe.slug,
    recipe.title_es,
    recipe.title_en,
    recipe.prep_time_minutes,
    recipe.cook_time_minutes,
    recipe.servings,
    recipe.difficulty,
    recipe.sibo_risk_level,
    JSON.stringify(recipe.sibo_alerts || []),
    (recipe.ingredients || []).length,
    (recipe.steps || []).length
  ];

  return headers.join(',') + '\n' + row.map(escapeCsv).join(',') + '\n';
}

function buildCurlCommand(recipe) {
  return `curl -X POST ${BACKEND_URL}/api/ingest/save \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(recipe, null, 2)}'`;
}

async function handleAction(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;

  const [action, slug] = data.replace('action:', '').split(':');

  try {
    await bot.answerCallbackQuery(callbackQuery.id);

    switch (action) {
      case 'post': {
        const res = await fetch(`${BACKEND_URL}/api/ingest/${slug}/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'published' })
        });

        const result = await res.json();

        if (res.ok) {
          await bot.editMessageText(`🚀 *Receta guardada en PostgreSQL*\n\n` +
            `📝 ${result.recipe.title_es}\n` +
            `Estado: *${result.recipe.status}*\n` +
            `ID: \`${result.recipe.id}\``, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
          });
        } else {
          await bot.editMessageText(`❌ Error al guardar: ${result.error}`, {
            chat_id: chatId,
            message_id: messageId
          });
        }
        break;
      }

      case 'csv': {
        const res = await fetch(`${BACKEND_URL}/api/ingest/${slug}/csv`, {
          method: 'POST'
        });

        if (res.ok) {
          const csvContent = await res.text();
          const tempPath = path.join(__dirname, 'logs', `${slug}.csv`);
          const logsDir = path.join(__dirname, 'logs');
          if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
          fs.writeFileSync(tempPath, csvContent);

          await bot.sendDocument(chatId, tempPath, {
            caption: `📄 CSV para *${slug}*`,
            parse_mode: 'Markdown'
          });

          await bot.editMessageText(`📄 *Archivo CSV generado*\n\nRevisa el documento adjunto.`, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
          });

          fs.unlinkSync(tempPath);
        } else {
          await bot.editMessageText(`❌ Error generando CSV.`, {
            chat_id: chatId,
            message_id: messageId
          });
        }
        break;
      }

      case 'curl': {
        const res = await fetch(`${BACKEND_URL}/api/ingest/${slug}/curl`, {
          method: 'POST'
        });

        const result = await res.json();

        if (res.ok) {
          await bot.editMessageText(`🛠️ *Comando cURL listo:*\n\n` +
            `\`\`\`bash\n${result.curl}\n\`\`\``, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
          });
        } else {
          await bot.editMessageText(`❌ Error generando cURL.`, {
            chat_id: chatId,
            message_id: messageId
          });
        }
        break;
      }
    }
  } catch (error) {
    console.error('[TelegramBot] Error handling action:', error);
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

async function handleOverwrite(chatId, confirmed) {
  const pending = pendingOverwrites.get(chatId);
  if (!pending) return;

  const { recipe, statusMsgId } = pending;
  pendingOverwrites.delete(chatId);

  if (!confirmed) {
    await bot.editMessageText('❌ Operación cancelada. La receta original se mantiene sin cambios.', {
      chat_id: chatId,
      message_id: statusMsgId
    });
    return;
  }

  try {
    await bot.editMessageText('🔄 Actualizando receta existente...', {
      chat_id: chatId,
      message_id: statusMsgId
    });

    const res = await fetch(`${BACKEND_URL}/api/ingest/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe)
    });

    const data = await res.json();

    if (res.ok) {
      await bot.editMessageText(`✅ *Receta actualizada correctamente*\n\n` + formatRecipeSummary(data.recipe), {
        chat_id: chatId,
        message_id: statusMsgId,
        parse_mode: 'Markdown',
        reply_markup: buildInlineKeyboard(data.recipe.slug)
      });
    } else {
      await bot.editMessageText(`❌ Error al actualizar: ${data.error}`, {
        chat_id: chatId,
        message_id: statusMsgId
      });
    }
  } catch (error) {
    console.error('[TelegramBot] Error in handleOverwrite:', error);
    bot.sendMessage(chatId, `❌ Error al actualizar la receta: ${error.message}`);
  }
}

export function initializeTelegramBot() {
  if (!TOKEN || !ALLOWED_USER_ID) {
    console.warn('[TelegramBot] TELEGRAM_BOT_TOKEN or TELEGRAM_USER_ID not set. Bot disabled.');
    return null;
  }

  try {
    bot = new TelegramBot(TOKEN, { polling: true });

    bot.on('message', (msg) => {
      if (!isAuthorized(msg.from.id)) {
        console.warn(`[TelegramBot] Blocked unauthorized user: ${msg.from.id}`);
        return;
      }

      const pending = pendingVoiceEdits.get(msg.chat.id);
      if (pending?.awaitingEdit && msg.text && !msg.text.startsWith('/')) {
        handleEditedVoiceText(msg);
        return;
      }

      if (msg.photo) {
        processImage(msg);
      } else if (msg.voice) {
        processVoice(msg);
      } else if (msg.text) {
        processText(msg);
      }
    });

    bot.on('callback_query', async (callbackQuery) => {
      if (!isAuthorized(callbackQuery.from.id)) return;

      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;

      if (callbackQuery.data === 'voice_confirm') {
        await bot.answerCallbackQuery(callbackQuery.id);
        await bot.editMessageText('⏳ Procesando receta...', {
          chat_id: chatId,
          message_id: messageId
        });
        await confirmVoiceRecipe(chatId);
        return;
      }

      if (callbackQuery.data === 'voice_edit') {
        await bot.answerCallbackQuery(callbackQuery.id);
        await requestVoiceEdit(chatId);
        return;
      }

      if (callbackQuery.data === 'voice_discard') {
        await bot.answerCallbackQuery(callbackQuery.id);
        pendingVoiceEdits.delete(chatId);
        await bot.editMessageText('🗑️ Audio descartado. Enviame otro cuando quieras.', {
          chat_id: chatId,
          message_id: messageId
        });
        return;
      }

      if (callbackQuery.data === 'overwrite_confirm') {
        await bot.answerCallbackQuery(callbackQuery.id);
        await handleOverwrite(chatId, true);
        return;
      }

      if (callbackQuery.data === 'overwrite_cancel') {
        await bot.answerCallbackQuery(callbackQuery.id);
        await handleOverwrite(chatId, false);
        return;
      }

      handleAction(callbackQuery);
    });

    bot.onText(/\/start/, (msg) => {
      bot.sendMessage(msg.chat.id,
        '🍳 *Wati Recipe Ingest Bot*\n\n' +
        'Envíame:\n' +
        '📸 *1 foto* de receta completa (OCR con OCDRNet)\n' +
        '📸 *2 fotos seguidas* → 1ra: ingredientes, 2da: preparación\n' +
        '📝 *Texto* de recetas para analizar\n' +
        '🎤 *Notas de voz* con recetas dictadas (transcripción con Groq Whisper)\n\n' +
        'Procesado con NVIDIA NIM (OCDRNet + Llama 4 Maverick + SDXL)\n\n' +
        'Procesaré todo y te daré opciones para guardar.',
        { parse_mode: 'Markdown' }
      );
    });

    bot.onText(/\/logs/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const res = await fetch(`${BACKEND_URL}/api/ingest/logs`);
        const data = await res.json();

        if (data.logs?.length > 0) {
          const logList = data.logs.slice(0, 10).map(l => `• ${l.filename}`).join('\n');
          bot.sendMessage(chatId, `📋 *Últimos logs:*\n\n${logList}`, { parse_mode: 'Markdown' });
        } else {
          bot.sendMessage(chatId, '📋 No hay logs de ingestión.');
        }
      } catch (error) {
        bot.sendMessage(chatId, `❌ Error obteniendo logs: ${error.message}`);
      }
    });

    console.log('[TelegramBot] Initialized and polling.');
    return bot;
  } catch (error) {
    console.error('[TelegramBot] Failed to initialize:', error.message);
    return null;
  }
}

initializeTelegramBot();
