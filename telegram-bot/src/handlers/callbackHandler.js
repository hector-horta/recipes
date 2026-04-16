import { sessionManager } from '../utils/session.js';
import { backendStore } from '../services/backendStore.js';
import { logger } from '../utils/logger.js';
import { formatRecipeSummary, buildInlineKeyboard } from '../utils/formatters.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendRecipeResult, sendDataConfirmation, sendImageFeedback } from '../utils/botUI.js';

/**
 * Smart helper to edit message regardless of whether it's a photo (caption) or text.
 */
async function smartEdit(bot, callbackQuery, newText, options = {}) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const isPhoto = !!callbackQuery.message.photo;

  try {
    if (isPhoto) {
      return await bot.editMessageCaption(newText, {
        chat_id: chatId,
        message_id: messageId,
        ...options
      });
    } else {
      return await bot.editMessageText(newText, {
        chat_id: chatId,
        message_id: messageId,
        ...options
      });
    }
  } catch (err) {
    if (err.message.includes('message is not modified')) return;
    throw err;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function handleCallback(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  try {
    // Phase 1: Normalize normalization - some buttons might have action: prefix, others might be direct
    let actionKey = data;
    let extraParam = null;

    if (data.startsWith('action:')) {
      const parts = data.split(':');
      actionKey = parts[1];
      extraParam = parts[2] || null; // This would be the slug if present
    }

    // Phase 2: Action Routing
    
    // Voice Flow
    if (actionKey === 'voice_confirm') return confirmVoiceRecipe(bot, callbackQuery);
    if (actionKey === 'voice_edit') return requestVoiceEdit(bot, chatId);
    if (actionKey === 'voice_discard') return discardVoice(bot, callbackQuery);
    
    // Overwrite Flow
    if (actionKey === 'overwrite_confirm') return handleOverwrite(bot, callbackQuery, true);
    if (actionKey === 'overwrite_cancel') return handleOverwrite(bot, callbackQuery, false);
    
    // Image Group Flow
    if (actionKey === 'process_single_image') return processSingleImage(bot, callbackQuery);
    if (actionKey === 'cancel_image_process') return cancelImageProcess(bot, callbackQuery);
    
    // Decoupled Flow Actions (Confirm/Cancel/Accept)
    if (actionKey === 'confirm-data') return handleConfirmData(bot, callbackQuery);
    if (actionKey === 'cancel' || actionKey === 'cancel-data') {
      return handleCancelData(bot, callbackQuery);
    }
    if (actionKey === 'accept-image') {
      return handleAcceptImage(bot, callbackQuery, extraParam);
    }
    
    // Refresh/Regenerate - needs handleAction
    if (actionKey === 'refresh-image') {
      return handleAction(bot, callbackQuery, 'refresh-image', extraParam);
    }

    // Generic Action Handler (slug-based: post, csv, curl)
    if (['post', 'csv', 'curl'].includes(actionKey)) {
      return handleAction(bot, callbackQuery, actionKey, extraParam);
    }

    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    logger.error('Error handling callback', { data, error: error.message });
    try { await bot.answerCallbackQuery(callbackQuery.id, { text: `Error: ${error.message}` }); } catch(e) {}
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

async function handleConfirmData(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const recipe = sessionManager.getPendingRecipe(chatId);
  if (!recipe) return bot.sendMessage(chatId, '❌ No hay datos de receta pendientes.');

  await smartEdit(bot, callbackQuery, '💾 Guardando borrador y generando imagen...');

  try {
    // Phase 3: Save as draft and trigger image generation
    const result = await backendStore.saveDraft(recipe);
    sessionManager.deletePendingRecipe(chatId);
    
    // Phase 4: Show image feedback
    await sendImageFeedback(bot, chatId, result.recipe);
  } catch (error) {
    logger.error('Error in handleConfirmData', { chatId, error: error.message });
    bot.sendMessage(chatId, `❌ Error al guardar borrador: ${error.message}`);
  }
}

async function handleCancelData(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  sessionManager.deletePendingRecipe(chatId);
  await smartEdit(bot, callbackQuery, '❌ Datos descartados.');
}

async function handleAcceptImage(bot, callbackQuery, directSlug = null) {
  const chatId = callbackQuery.message.chat.id;
  let slug = directSlug;
  
  if (!slug) {
    const session = sessionManager.getImageFeedback(chatId);
    slug = session?.slug;
  }

  if (!slug) return bot.sendMessage(chatId, '❌ No hay una imagen activa para aceptar.');

  try {
    await smartEdit(bot, callbackQuery, '✅ Publicando receta...');
    const result = await backendStore.publishRecipe(slug);
    sessionManager.deleteImageFeedback(chatId);

    await bot.sendMessage(chatId, `🎉 *¡Felicidades!*\n\nLa receta *${result.recipe.title_es}* ya está publicada en el portal.`, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error al publicar: ${error.message}`);
  }
}

async function confirmVoiceRecipe(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const pending = sessionManager.getVoiceEdit(chatId);
  if (!pending) return bot.sendMessage(chatId, '❌ No hay audio pendiente.');

  await smartEdit(bot, callbackQuery, '🔍 Extrayendo datos...');

  try {
    const result = await backendStore.ingestText(pending.transcribedText, 'audio', false, false);
    sessionManager.deleteVoiceEdit(chatId);
    
    sessionManager.setPendingRecipe(chatId, result.recipe);
    await sendDataConfirmation(bot, chatId, result.recipe);
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

async function requestVoiceEdit(bot, chatId) {
  const pending = sessionManager.getVoiceEdit(chatId);
  if (pending) {
    sessionManager.setVoiceEdit(chatId, { ...pending, awaitingEdit: true });
  }
  await bot.sendMessage(chatId, '✏️ Envíame el texto corregido:');
}

async function discardVoice(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  sessionManager.deleteVoiceEdit(chatId);
  await smartEdit(bot, callbackQuery, '🗑️ Audio descartado.');
}

async function cancelImageProcess(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  sessionManager.deleteImageGroup(chatId);
  await smartEdit(bot, callbackQuery, '❌ Operación cancelada.');
}

async function handleAction(bot, callbackQuery, action, slug) {
  const chatId = callbackQuery.message.chat.id;
  try {
    switch (action) {
      case 'post': {
        const result = await backendStore.publishRecipe(slug);
        await smartEdit(bot, callbackQuery, `🚀 *Receta publicada*\n\n📝 ${result.recipe.title_es}\nID: \`${result.recipe.id}\``, {
          parse_mode: 'Markdown'
        });
        break;
      }
      case 'csv': {
        const csvContent = await backendStore.getCSV(slug);
        const logDir = path.join(__dirname, '..', '..', 'logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        const tempPath = path.join(logDir, `${slug}.csv`);
        fs.writeFileSync(tempPath, csvContent);

        await bot.sendDocument(chatId, tempPath, { caption: `📄 CSV para *${slug}*`, parse_mode: 'Markdown' });
        fs.unlinkSync(tempPath);
        break;
      }
      case 'curl': {
        const result = await backendStore.getCurl(slug);
        await smartEdit(bot, callbackQuery, `🛠️ *Comando cURL:*\n\n\`\`\`bash\n${result.curl}\n\`\`\``, {
          parse_mode: 'Markdown'
        });
        break;
      }
      case 'refresh-image': {
        // Triggered from feedack flow or regular refresh
        sessionManager.setImageFeedback(chatId, { slug });
        await bot.sendMessage(chatId, '📸 *Feedback para la imagen*\n\nEnvíame comentarios para mejorar la foto (ej: "más iluminación", "estilo minimalista", "primer plano"):', {
          parse_mode: 'Markdown'
        });
        break;
      }
    }
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error en acción ${action}: ${error.message}`);
  }
}

async function handleOverwrite(bot, callbackQuery, confirmed) {
  const chatId = callbackQuery.message.chat.id;
  const pending = sessionManager.getOverwrite(chatId);
  if (!pending) return;
  const { recipe, statusMsgId } = pending;
  sessionManager.deleteOverwrite(chatId);

  if (!confirmed) {
    return await smartEdit(bot, callbackQuery, '❌ Cancelado.');
  }

  try {
    await smartEdit(bot, callbackQuery, '🔄 Actualizando...');
    const result = await backendStore.saveRecipe(recipe);
    await sendRecipeResult(bot, chatId, result.recipe, callbackQuery.message.message_id);
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

async function processSingleImage(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const group = sessionManager.getImageGroup(chatId);
  if (!group || group.images.length === 0) return;
  sessionManager.deleteImageGroup(chatId);

  try {
    await smartEdit(bot, callbackQuery, '🔍 Extrayendo datos...');
    const fileLink = await bot.getFileLink(group.images[0]);
    const url = typeof fileLink === 'string' ? fileLink : fileLink?.href || fileLink?.toString();

    // DECOUPLED
    const result = await backendStore.ingestImage(url, false, false);
    
    sessionManager.setPendingRecipe(chatId, result.recipe);
    await sendDataConfirmation(bot, chatId, result.recipe);
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

export async function sendConflictPrompt(bot, chatId, recipe, statusMsgId) {
  await bot.editMessageText(`⚠️ *La receta ya existe*\n\n"${recipe.title_es}" ya está publicada.\n\n¿Deseas actualizarla?`, {
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
