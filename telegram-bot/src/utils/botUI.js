import { formatRecipeSummary, buildInlineKeyboard, buildDataConfirmationKeyboard, buildImageFeedbackKeyboard } from './formatters.js';
import { config } from '../config.js';
import { logger } from './logger.js';

/**
 * PHASE 1: Send structured data summary for confirmation (No image)
 */
export async function sendDataConfirmation(bot, chatId, recipe) {
  const summary = formatRecipeSummary(recipe, 'confirmation');
  const keyboard = buildDataConfirmationKeyboard();

  await bot.sendMessage(chatId, summary, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Helper to download image as buffer for Telegram
 */
async function downloadImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    logger.error('Failed to download image from backend', { url, error: err.message });
    return null;
  }
}

/**
 * PHASE 2: Send generated image for confirmation/feedback
 */
export async function sendImageFeedback(bot, chatId, recipe, previousMsgId = null) {
  if (previousMsgId) {
    try { await bot.deleteMessage(chatId, previousMsgId); } catch (e) {}
  }

  const summary = formatRecipeSummary(recipe, 'image_review');
  const keyboard = buildImageFeedbackKeyboard(recipe.slug);
  
  let imageBuffer = null;
  if (recipe.image_url) {
    const baseUrl = config.BACKEND_URL.replace(/\/$/, '');
    const imagePath = recipe.image_url.replace(/^\//, '');
    const imageUrl = `${baseUrl}/${imagePath}`;
    imageBuffer = await downloadImage(imageUrl);
  }

  try {
    if (imageBuffer) {
      await bot.sendPhoto(chatId, imageBuffer, {
        caption: summary.length > 1024 ? summary.slice(0, 1021) + '...' : summary,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }, { filename: 'recipe.jpg' });
    } else {
      // Fallback if no image or download failed
      await bot.sendMessage(chatId, `⚠️ No pudimos generar la foto, pero aquí están los datos:\n\n${summary}`, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      return;
    }

    if (summary.length > 1024) {
      await bot.sendMessage(chatId, summary, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
  } catch (err) {
    logger.error('Error sending photo feedback', { slug: recipe.slug, error: err.message });
    await bot.sendMessage(chatId, `⚠️ Error al enviar la foto, pero aquí están los datos:\n\n${summary}`, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
}

/**
 * Sends a final published recipe result
 */
export async function sendRecipeResult(bot, chatId, recipe, previousMsgId = null) {
  if (previousMsgId) {
    try { await bot.deleteMessage(chatId, previousMsgId); } catch (e) {}
  }

  const summary = formatRecipeSummary(recipe, 'published');
  const keyboard = buildInlineKeyboard(recipe.slug);

  let imageBuffer = null;
  if (recipe.image_url) {
    const baseUrl = config.BACKEND_URL.replace(/\/$/, '');
    const imagePath = recipe.image_url.replace(/^\//, '');
    const imageUrl = `${baseUrl}/${imagePath}`;
    imageBuffer = await downloadImage(imageUrl);
  }

  try {
    if (imageBuffer) {
      await bot.sendPhoto(chatId, imageBuffer, {
        caption: summary.length > 1024 ? summary.slice(0, 1021) + '...' : summary,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }, { filename: 'recipe.jpg' });
    } else {
      await bot.sendMessage(chatId, summary, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      return;
    }

    if (summary.length > 1024) {
      await bot.sendMessage(chatId, summary, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
  } catch (err) {
    logger.error('Error sending photo result', { slug: recipe.slug, error: err.message });
    await bot.sendMessage(chatId, summary, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
}
