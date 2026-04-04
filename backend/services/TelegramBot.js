import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_USER_ID = process.env.TELEGRAM_USER_ID;
const API_BASE = process.env.API_BASE || `http://localhost:${process.env.PORT || 5001}`;

let bot = null;
const pendingActions = new Map();

function isAuthorized(userId) {
  return userId.toString() === ALLOWED_USER_ID;
}

function buildInlineKeyboard(recipeSlug) {
  return {
    inline_keyboard: [
      [
        { text: '🚀 POST (PostgreSQL)', callback_data: `action:post:${recipeSlug}` },
        { text: '📄 CSV', callback_data: `action:csv:${recipeSlug}` }
      ],
      [
        { text: '🛠️ Postman/cURL', callback_data: `action:curl:${recipeSlug}` }
      ]
    ]
  };
}

async function processImage(msg) {
  const chatId = msg.chat.id;

  try {
    const processingMsg = await bot.sendMessage(chatId, '🔍 Extrayendo texto de la imagen con NVIDIA VLM...');

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileLink = await bot.getFileLink(fileId);

    const res = await fetch(`${API_BASE}/api/ingest/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-User-Id': msg.from.id.toString()
      },
      body: JSON.stringify({
        imageUrl: fileLink.href,
        generateImage: true
      })
    });

    const data = await res.json();

    if (!res.ok) {
      await bot.editMessageText(`❌ Error: ${data.error}`, {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });
      return;
    }

    const recipe = data.recipe;
    const alerts = recipe.sibo_alerts?.length > 0
      ? `\n\n⚠️ *Alertas SIBO:*\n${recipe.sibo_alerts.map(a => `• ${a}`).join('\n')}`
      : '';

    const summary = `✅ *Receta procesada*\n\n` +
      `📝 *${recipe.title_es}*\n` +
      `🇬🇧 ${recipe.title_en}\n\n` +
      `⏱️ Prep: ${recipe.prep_time_minutes}min | Cocción: ${recipe.cook_time_minutes}min\n` +
      `👥 Porciones: ${recipe.servings} | Dificultad: ${recipe.difficulty}\n` +
      `🦠 Riesgo SIBO: *${recipe.sibo_risk_level.toUpperCase()}*${alerts}\n` +
      `🏷️ Tags: ${(recipe.tags || []).join(', ') || 'Ninguno'}\n\n` +
      `Elige una acción:`;

    await bot.editMessageText(summary, {
      chat_id: chatId,
      message_id: processingMsg.message_id,
      parse_mode: 'Markdown',
      reply_markup: buildInlineKeyboard(recipe.slug)
    });

    pendingActions.set(recipe.slug, recipe);

  } catch (error) {
    console.error('[TelegramBot] Error processing image:', error);
    bot.sendMessage(chatId, `❌ Error procesando la imagen: ${error.message}`);
  }
}

async function processText(msg) {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text.startsWith('/')) return;

  try {
    const processingMsg = await bot.sendMessage(chatId, '🧠 Analizando receta con Nemotron-4 340B...');

    const res = await fetch(`${API_BASE}/api/ingest/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-User-Id': msg.from.id.toString()
      },
      body: JSON.stringify({
        text,
        generateImage: true,
        sourceType: 'telegram',
        sourceReference: `telegram:${msg.message_id}`
      })
    });

    const data = await res.json();

    if (!res.ok) {
      await bot.editMessageText(`❌ Error: ${data.error}`, {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });
      return;
    }

    const recipe = data.recipe;
    const alerts = recipe.sibo_alerts?.length > 0
      ? `\n\n⚠️ *Alertas SIBO:*\n${recipe.sibo_alerts.map(a => `• ${a}`).join('\n')}`
      : '';

    const summary = `✅ *Receta procesada*\n\n` +
      `📝 *${recipe.title_es}*\n` +
      `🇬🇧 ${recipe.title_en}\n\n` +
      `⏱️ Prep: ${recipe.prep_time_minutes}min | Cocción: ${recipe.cook_time_minutes}min\n` +
      `👥 Porciones: ${recipe.servings} | Dificultad: ${recipe.difficulty}\n` +
      `🦠 Riesgo SIBO: *${recipe.sibo_risk_level.toUpperCase()}*${alerts}\n` +
      `🏷️ Tags: ${(recipe.tags || []).join(', ') || 'Ninguno'}\n\n` +
      `Elige una acción:`;

    await bot.editMessageText(summary, {
      chat_id: chatId,
      message_id: processingMsg.message_id,
      parse_mode: 'Markdown',
      reply_markup: buildInlineKeyboard(recipe.slug)
    });

    pendingActions.set(recipe.slug, recipe);

  } catch (error) {
    console.error('[TelegramBot] Error processing text:', error);
    bot.sendMessage(chatId, `❌ Error procesando el texto: ${error.message}`);
  }
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
        const res = await fetch(`${API_BASE}/api/ingest/${slug}/post`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Telegram-User-Id': callbackQuery.from.id.toString()
          },
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
        const res = await fetch(`${API_BASE}/api/ingest/${slug}/csv`, {
          method: 'POST',
          headers: {
            'X-Telegram-User-Id': callbackQuery.from.id.toString()
          }
        });

        if (res.ok) {
          const csvContent = await res.text();
          const tempPath = path.join(__dirname, '..', 'ingest_logs', `${slug}.csv`);
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
        const res = await fetch(`${API_BASE}/api/ingest/${slug}/curl`, {
          method: 'POST',
          headers: {
            'X-Telegram-User-Id': callbackQuery.from.id.toString()
          }
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

      if (msg.photo) {
        processImage(msg);
      } else if (msg.text) {
        processText(msg);
      }
    });

    bot.on('callback_query', (callbackQuery) => {
      if (!isAuthorized(callbackQuery.from.id)) return;
      handleAction(callbackQuery);
    });

    bot.onText(/\/start/, (msg) => {
      bot.sendMessage(msg.chat.id,
        '🍳 *Wati Recipe Ingest Bot*\n\n' +
        'Envíame:\n' +
        '📸 *Fotos* de libros de recetas (OCR)\n' +
        '📝 *Texto* de recetas para analizar\n\n' +
        'Procesaré todo con NVIDIA NIMs y te daré opciones para guardar.',
        { parse_mode: 'Markdown' }
      );
    });

    bot.onText(/\/logs/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const res = await fetch(`${API_BASE}/api/ingest/logs`, {
          headers: { 'X-Telegram-User-Id': msg.from.id.toString() }
        });
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
