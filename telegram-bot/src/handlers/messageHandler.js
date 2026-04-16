import { sessionManager } from '../utils/session.js';
import { backendStore } from '../services/backendStore.js';
import { logger } from '../utils/logger.js';
import { sendRecipeResult, sendDataConfirmation } from '../utils/botUI.js';

/**
 * Validates basic message constraints
 */
function validateMessage(msg) {
  if (!msg || !msg.chat || !msg.chat.id) return false;
  return true;
}

export async function processImage(bot, msg) {
  if (!validateMessage(msg)) return;
  const chatId = msg.chat.id;
  const photo = msg.photo[msg.photo.length - 1];
  const fileId = photo.file_id;

  logger.info(`Processing image from ${chatId}`, { fileId });

  const existingGroup = sessionManager.getImageGroup(chatId);
  if (existingGroup) {
    existingGroup.images.push(fileId);
    
    if (existingGroup.images.length === 2) {
      sessionManager.deleteImageGroup(chatId);
      return processImageGroup(bot, chatId, existingGroup.images, existingGroup.statusMsgId);
    }
    return;
  }

  const group = { images: [fileId], statusMsgId: null };
  sessionManager.setImageGroup(chatId, group);

  const statusMsg = await bot.sendMessage(chatId, '📸 Imagen recibida (1/2).\n\nSi es la única foto, procesala ya. Si falta la preparación, envía la segunda foto.', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔍 Procesar sola esta foto', callback_data: 'process_single_image' }],
        [{ text: '❌ Cancelar', callback_data: 'cancel_image_process' }]
      ]
    }
  });

  group.statusMsgId = statusMsg.message_id;
}

async function processImageGroup(bot, chatId, fileIds, statusMsgId) {
  try {
    await bot.editMessageText('🔍 Extrayendo texto de ambas imágenes...', { chat_id: chatId, message_id: statusMsgId });

    const fileLinks = await Promise.all(fileIds.map(fid => bot.getFileLink(fid)));
    const urls = fileLinks.map(link => typeof link === 'string' ? link : link?.href || link?.toString());

    // DECOUPLED: Save=false, Image=false
    const result = await backendStore.ingestImages(urls[0], urls[1], false, false);

    if (statusMsgId) {
      try { await bot.deleteMessage(chatId, statusMsgId); } catch (e) {}
    }

    sessionManager.setPendingRecipe(chatId, result.recipe);
    await sendDataConfirmation(bot, chatId, result.recipe);
  } catch (error) {
    logger.error('Error processing image group', { chatId, error: error.message });
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

export async function processText(bot, msg) {
  if (!msg.text || msg.text.startsWith('/')) return;
  const chatId = msg.chat.id;
  
  try {
    const processingMsg = await bot.sendMessage(chatId, '🧠 Analizando receta...');
    
    // DECOUPLED: Save=false, Image=false
    const result = await backendStore.ingestText(msg.text, 'telegram', false, false);

    try { await bot.deleteMessage(chatId, processingMsg.message_id); } catch (e) {}

    sessionManager.setPendingRecipe(chatId, result.recipe);
    await sendDataConfirmation(bot, chatId, result.recipe);
  } catch (error) {
    logger.error('Error processing text', { chatId, error: error.message });
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

export async function processVoice(bot, msg) {
  const chatId = msg.chat.id;
  try {
    const processingMsg = await bot.sendMessage(chatId, '🎤 Transcribiendo audio...');
    const fileLink = await bot.getFileLink(msg.voice.file_id);
    const audioUrl = typeof fileLink === 'string' ? fileLink : fileLink?.href || fileLink?.toString();

    const data = await backendStore.transcribeAudio(audioUrl, 'es', false);

    sessionManager.setVoiceEdit(chatId, {
      audioUrl,
      transcribedText: data.transcribedText,
      messageId: processingMsg.message_id
    });

    await bot.editMessageText(
      `🎙️ *Texto transcrito:*\n\n\`\`\`\n${data.transcribedText}\n\`\`\`\n\n¿El texto es correcto?`,
      {
        chat_id: chatId,
        message_id: processingMsg.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Confirmar', callback_data: 'voice_confirm' },
              { text: '✏️ Editar', callback_data: 'voice_edit' }
            ],
            [{ text: '🗑️ Descartar', callback_data: 'voice_discard' }]
          ]
        }
      }
    );
  } catch (error) {
    logger.error('Error processing voice', { chatId, error: error.message });
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

/**
 * Specifically for Voice flow after confirmation: Analizes text and shows confirmation
 */
export async function processVoiceConfirmation(bot, chatId, text, previousMsgId) {
  try {
    const result = await backendStore.ingestText(text, 'audio', false, false);
    
    if (previousMsgId) {
      try { await bot.deleteMessage(chatId, previousMsgId); } catch (e) {}
    }

    sessionManager.setPendingRecipe(chatId, result.recipe);
    await sendDataConfirmation(bot, chatId, result.recipe);
  } catch (error) {
    logger.error('Error in voice confirmation analysis', { chatId, error: error.message });
    bot.sendMessage(chatId, `❌ Error analizando transcripción: ${error.message}`);
  }
}

async function sendConflictPrompt(bot, chatId, recipe, statusMsgId) {
  sessionManager.setOverwrite(chatId, { recipe, statusMsgId });
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
