import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractTextFromImage, analyzeAndStructureRecipe, generateRecipeImage } from './NvidiaNIM.js';
import { saveIngestLog } from '../middleware/recoveryLogger.js';
import { Recipe } from '../models/Recipe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_USER_ID = process.env.TELEGRAM_USER_ID;
const NVIDIA_KEY = process.env.NVIDIA_API_KEY;

let bot = null;

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

function generateSlug(title) {
  return (title || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
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

  try {
    const processingMsg = await bot.sendMessage(chatId, '🔍 Extrayendo texto de la imagen con Llama 4 Maverick...');

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileLink = await bot.getFileLink(fileId);
    const imageUrl = typeof fileLink === 'string' ? fileLink : fileLink?.href || fileLink?.toString();

    if (!NVIDIA_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const rawText = await extractTextFromImage(imageUrl, NVIDIA_KEY);

    if (!rawText.trim()) {
      await bot.editMessageText('❌ No se pudo extraer texto de la imagen.', {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });
      return;
    }

    await bot.editMessageText('🧠 Analizando y estructurando receta...', {
      chat_id: chatId,
      message_id: processingMsg.message_id
    });

    const structured = await analyzeAndStructureRecipe(rawText, NVIDIA_KEY);

    const titleEs = structured.title?.es || 'Receta sin título';
    const slug = generateSlug(titleEs);

    let imageResult = null;
    if (NVIDIA_KEY) {
      await bot.editMessageText('🎨 Generando imagen con SDXL...', {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });
      try {
        imageResult = await generateRecipeImage(titleEs, NVIDIA_KEY);
      } catch (imgErr) {
        console.warn('[TelegramBot] Failed to generate image:', imgErr.message);
      }
    }

    const recipeData = {
      title_es: titleEs,
      title_en: structured.title?.en || titleEs,
      slug,
      prep_time_minutes: structured.prepTimeMinutes || 0,
      cook_time_minutes: structured.cookTimeMinutes || 0,
      servings: structured.servings || 1,
      difficulty: structured.difficulty || 'medium',
      ingredients: structured.ingredients || [],
      steps: structured.steps || [],
      tags: structured.tags || [],
      image_url: imageResult?.url || null,
      image_filename: imageResult?.filename || null,
      sibo_risk_level: structured.siboRiskLevel || 'safe',
      sibo_alerts: structured.siboAlerts || [],
      source_type: 'ocr_image',
      source_reference: imageUrl,
      status: 'draft'
    };

    saveIngestLog(recipeData);

    await bot.editMessageText(formatRecipeSummary(recipeData), {
      chat_id: chatId,
      message_id: processingMsg.message_id,
      parse_mode: 'Markdown',
      reply_markup: buildInlineKeyboard(slug)
    });

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
    const processingMsg = await bot.sendMessage(chatId, '🧠 Analizando receta con Llama 4 Maverick...');

    if (!NVIDIA_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const structured = await analyzeAndStructureRecipe(text, NVIDIA_KEY);

    const titleEs = structured.title?.es || 'Receta sin título';
    const slug = generateSlug(titleEs);

    let imageResult = null;
    if (NVIDIA_KEY) {
      await bot.editMessageText('🎨 Generando imagen con SDXL...', {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });
      try {
        imageResult = await generateRecipeImage(titleEs, NVIDIA_KEY);
      } catch (imgErr) {
        console.warn('[TelegramBot] Failed to generate image:', imgErr.message);
      }
    }

    const recipeData = {
      title_es: titleEs,
      title_en: structured.title?.en || titleEs,
      slug,
      prep_time_minutes: structured.prepTimeMinutes || 0,
      cook_time_minutes: structured.cookTimeMinutes || 0,
      servings: structured.servings || 1,
      difficulty: structured.difficulty || 'medium',
      ingredients: structured.ingredients || [],
      steps: structured.steps || [],
      tags: structured.tags || [],
      image_url: imageResult?.url || null,
      image_filename: imageResult?.filename || null,
      sibo_risk_level: structured.siboRiskLevel || 'safe',
      sibo_alerts: structured.siboAlerts || [],
      source_type: 'telegram',
      source_reference: `telegram:${msg.message_id}`,
      status: 'draft'
    };

    saveIngestLog(recipeData);

    await bot.editMessageText(formatRecipeSummary(recipeData), {
      chat_id: chatId,
      message_id: processingMsg.message_id,
      parse_mode: 'Markdown',
      reply_markup: buildInlineKeyboard(slug)
    });

  } catch (error) {
    console.error('[TelegramBot] Error processing text:', error);
    bot.sendMessage(chatId, `❌ Error procesando el texto: ${error.message}`);
  }
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
  return `curl -X POST http://localhost:5001/api/ingest/save \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(recipe, null, 2)}'`;
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
        const recipe = await Recipe.findOne({ where: { slug } });
        if (!recipe) {
          await bot.editMessageText(`❌ Receta "${slug}" no encontrada en la base de datos.`, {
            chat_id: chatId,
            message_id: messageId
          });
          return;
        }

        recipe.status = 'published';
        await recipe.save();

        await bot.editMessageText(`🚀 *Receta guardada en PostgreSQL*\n\n` +
          `📝 ${recipe.title_es}\n` +
          `Estado: *${recipe.status}*\n` +
          `ID: \`${recipe.id}\``, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown'
        });
        break;
      }

      case 'csv': {
        const recipe = await Recipe.findOne({ where: { slug } });
        if (!recipe) {
          await bot.editMessageText(`❌ Receta "${slug}" no encontrada.`, {
            chat_id: chatId,
            message_id: messageId
          });
          return;
        }

        const csvContent = buildCSVRow(recipe.toJSON());
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
        break;
      }

      case 'curl': {
        const recipe = await Recipe.findOne({ where: { slug } });
        if (!recipe) {
          await bot.editMessageText(`❌ Receta "${slug}" no encontrada.`, {
            chat_id: chatId,
            message_id: messageId
          });
          return;
        }

        const curlCmd = buildCurlCommand(recipe.toJSON());

        await bot.editMessageText(`🛠️ *Comando cURL listo:*\n\n` +
          `\`\`\`bash\n${curlCmd}\n\`\`\``, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown'
        });
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
        '📸 *Fotos* de libros de recetas (OCR con Llama 4 Maverick)\n' +
        '📝 *Texto* de recetas para analizar\n\n' +
        'Procesado con NVIDIA NIM (Llama 4 Maverick + SDXL)\n\n' +
        'Procesaré todo y te daré opciones para guardar.',
        { parse_mode: 'Markdown' }
      );
    });

    bot.onText(/\/logs/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const logsDir = path.join(__dirname, '..', 'ingest_logs');
        if (!fs.existsSync(logsDir)) {
          bot.sendMessage(chatId, '📋 No hay logs de ingestión.');
          return;
        }

        const files = fs.readdirSync(logsDir)
          .filter(f => f.endsWith('.json'))
          .sort()
          .reverse()
          .slice(0, 10);

        if (files.length > 0) {
          const logList = files.map(f => `• ${f}`).join('\n');
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
