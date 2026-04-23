import TelegramBot from 'node-telegram-bot-api';
import { config, validateConfig } from './config.js';
import { logger } from './utils/logger.js';
import { processImage, processText, processVoice } from './handlers/messageHandler.js';
import { handleCallback } from './handlers/callbackHandler.js';
import { handleStart, handleLogs } from './handlers/commandHandler.js';
import { sessionManager } from './utils/session.js';
import { sendRecipeResult, sendImageFeedback } from './utils/botUI.js';
import { backendStore } from './services/backendStore.js';

async function init() {
  try {
    validateConfig();
  } catch (err) {
    logger.error('Config validation failed', { error: err.message });
    process.exit(1);
  }

  const bot = new TelegramBot(config.TOKEN, { polling: true });

  const isAuthorized = (userId) => userId.toString() === config.ALLOWED_USER_ID;

  // Global error handler for polling errors
  bot.on('polling_error', (error) => {
    logger.error('Polling error', { error: error.message, code: error.code });
  });

  // Message router
  bot.on('message', async (msg) => {
    if (!isAuthorized(msg.from?.id)) {
      logger.warn('Unauthorized access attempt', { userId: msg.from?.id, username: msg.from?.username });
      return;
    }

    const chatId = msg.chat.id;

    // Check if awaiting voice edit
    const pendingVoice = sessionManager.getVoiceEdit(chatId);
    if (pendingVoice?.awaitingEdit && msg.text && !msg.text.startsWith('/')) {
      try {
        sessionManager.setVoiceEdit(chatId, { ...pendingVoice, transcribedText: msg.text, awaitingEdit: false });
        const statusMsg = await bot.sendMessage(chatId, `📝 *Texto actualizado:*\n\n\`\`\`\n${msg.text}\n\`\`\`\n\n¿Ahora sí?`, {
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
        });
        return;
      } catch (err) {
        logger.error('Error handling voice edit', { chatId, error: err.message });
      }
    }

    // Check if awaiting image feedback
    const pendingFeedback = sessionManager.getImageFeedback(chatId);
    if (pendingFeedback && msg.text && !msg.text.startsWith('/')) {
      try {
        const { slug } = pendingFeedback;
        sessionManager.deleteImageFeedback(chatId);
        
        const statusMsg = await bot.sendMessage(chatId, '⏳ *Regenerando imagen con tu feedback...*', { parse_mode: 'Markdown' });
        
        const result = await backendStore.refreshImage(slug, msg.text);
        
        await sendImageFeedback(bot, chatId, result.recipe, statusMsg.message_id);
        
        return;
      } catch (err) {
        logger.error('Error handling image feedback', { chatId, error: err.message });
        bot.sendMessage(chatId, `❌ Error: ${err.message}`);
      }
    }

    // Media and text handlers
    if (msg.photo) {
      processImage(bot, msg).catch(err => logger.error('processImage failed', { error: err.message }));
    } else if (msg.voice) {
      processVoice(bot, msg).catch(err => logger.error('processVoice failed', { error: err.message }));
    } else if (msg.text) {
      if (msg.text === '/start') return handleStart(bot, msg);
      if (msg.text === '/logs') return handleLogs(bot, msg);
      if (msg.text.startsWith('/')) return; // Ignore unknown commands
      processText(bot, msg).catch(err => logger.error('processText failed', { error: err.message }));
    }
  });

  // Callback query router
  bot.on('callback_query', async (query) => {
    if (!isAuthorized(query.from.id)) return;
    handleCallback(bot, query).catch(err => logger.error('handleCallback failed', { error: err.message }));
  });

  logger.info('Telegram Bot started and polling...');
}

init();
