import { sessionManager } from '../utils/session.js';
import { backendStore } from '../services/backendStore.js';
import { logger } from '../utils/logger.js';
import { formatRecipeSummary, buildInlineKeyboard } from '../utils/formatters.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function handleCallback(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;

  try {
    if (data === 'voice_confirm') return confirmVoiceRecipe(bot, chatId, messageId);
    if (data === 'voice_edit') return requestVoiceEdit(bot, chatId);
    if (data === 'voice_discard') return discardVoice(bot, chatId, messageId);
    if (data === 'overwrite_confirm') return handleOverwrite(bot, chatId, true);
    if (data === 'overwrite_cancel') return handleOverwrite(bot, chatId, false);
    if (data === 'process_single_image') return processSingleImage(bot, chatId, messageId);
    if (data === 'cancel_image_process') return cancelImageProcess(bot, chatId, messageId);

    if (data.startsWith('action:')) {
      const parts = data.split(':');
      const action = parts[1];
      const slug = parts[2];
      return handleAction(bot, chatId, messageId, action, slug);
    }

    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    logger.error('Error handling callback', { data, error: error.message });
    try { await bot.answerCallbackQuery(callbackQuery.id, { text: `Error: ${error.message}` }); } catch(e) {}
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

async function confirmVoiceRecipe(bot, chatId, messageId) {
  const pending = sessionManager.getVoiceEdit(chatId);
  if (!pending) return bot.sendMessage(chatId, '❌ No hay audio pendiente.');

  await bot.editMessageText('⏳ Procesando receta...', { chat_id: chatId, message_id: messageId });

  try {
    const result = await backendStore.ingestText(pending.transcribedText, 'audio');
    if (result.conflict) {
      sessionManager.setOverwrite(chatId, { recipe: result.recipe, statusMsgId: messageId });
      return sendConflictPrompt(bot, chatId, result.recipe, messageId);
    }

    await bot.editMessageText(formatRecipeSummary(result.recipe), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: buildInlineKeyboard(result.recipe.slug)
    });
    sessionManager.deleteVoiceEdit(chatId);
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

async function discardVoice(bot, chatId, messageId) {
  sessionManager.deleteVoiceEdit(chatId);
  await bot.editMessageText('🗑️ Audio descartado.', { chat_id: chatId, message_id: messageId });
}

async function cancelImageProcess(bot, chatId, messageId) {
  sessionManager.deleteImageGroup(chatId);
  await bot.editMessageText('❌ Operación cancelada.', { chat_id: chatId, message_id: messageId });
}

async function handleAction(bot, chatId, messageId, action, slug) {
  try {
    switch (action) {
      case 'post': {
        const result = await backendStore.postRecipe(slug);
        await bot.editMessageText(`🚀 *Receta publicada*\n\n📝 ${result.recipe.title_es}\nID: \`${result.recipe.id}\``, {
          chat_id: chatId,
          message_id: messageId,
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
        await bot.editMessageText(`🛠️ *Comando cURL:*\n\n\`\`\`bash\n${result.curl}\n\`\`\``, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown'
        });
        break;
      }
    }
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error en acción ${action}: ${error.message}`);
  }
}

async function handleOverwrite(bot, chatId, confirmed) {
  const pending = sessionManager.getOverwrite(chatId);
  if (!pending) return;
  const { recipe, statusMsgId } = pending;
  sessionManager.deleteOverwrite(chatId);

  if (!confirmed) {
    return bot.editMessageText('❌ Cancelado.', { chat_id: chatId, message_id: statusMsgId });
  }

  try {
    await bot.editMessageText('🔄 Actualizando...', { chat_id: chatId, message_id: statusMsgId });
    const result = await backendStore.saveRecipe(recipe);
    await bot.editMessageText(`✅ *Actualizada*\n\n` + formatRecipeSummary(result.recipe), {
      chat_id: chatId,
      message_id: statusMsgId,
      parse_mode: 'Markdown',
      reply_markup: buildInlineKeyboard(result.recipe.slug)
    });
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

async function processSingleImage(bot, chatId, messageId) {
  const group = sessionManager.getImageGroup(chatId);
  if (!group || group.images.length === 0) return;
  sessionManager.deleteImageGroup(chatId);

  try {
    await bot.editMessageText('🔍 Procesando imagen...', { chat_id: chatId, message_id: messageId });
    const fileLink = await bot.getFileLink(group.images[0]);
    const url = typeof fileLink === 'string' ? fileLink : fileLink?.href || fileLink?.toString();

    const result = await backendStore.ingestImage(url);
    if (result.conflict) {
      sessionManager.setOverwrite(chatId, { recipe: result.recipe, statusMsgId: messageId });
      return sendConflictPrompt(bot, chatId, result.recipe, messageId);
    }

    await bot.editMessageText(formatRecipeSummary(result.recipe), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: buildInlineKeyboard(result.recipe.slug)
    });
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

async function sendConflictPrompt(bot, chatId, recipe, statusMsgId) {
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
