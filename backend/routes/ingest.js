import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Recipe } from '../models/Recipe.js';
import { extractTextFromImage, analyzeAndStructureRecipe, generateRecipeImage } from '../services/NvidiaNIM.js';
import { transcribeAudio } from '../services/GroqWhisper.js';
import { saveIngestLog } from '../middleware/recoveryLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

function getApiKey() {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error('NVIDIA_API_KEY not configured');
  return key;
}

function generateSlug(title) {
  return (title || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

router.post('/image', async (req, res, next) => {
  try {
    const apiKey = getApiKey();
    const { imageUrl, generateImage = true } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required.' });
    }

    const rawText = await extractTextFromImage(imageUrl, apiKey);

    if (!rawText.trim()) {
      return res.status(400).json({ error: 'No text could be extracted from the image.' });
    }

    const structured = await analyzeAndStructureRecipe(rawText, apiKey);

    const titleEs = structured.title?.es || 'Receta sin título';
    const slug = generateSlug(titleEs);

    let imageResult = null;
    if (generateImage) {
      try {
        imageResult = await generateRecipeImage(titleEs, apiKey);
      } catch (imgErr) {
        console.warn('[Ingest] Failed to generate image:', imgErr.message);
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

    const recipe = await Recipe.create(recipeData);

    res.status(200).json({
      status: 'processed',
      recipe: recipe.toJSON(),
      rawText,
      tripleCheck: buildTripleCheckMenu(recipeData)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/text', async (req, res, next) => {
  try {
    const apiKey = getApiKey();
    const { text, generateImage = true } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text is required.' });
    }

    const structured = await analyzeAndStructureRecipe(text, apiKey);

    const titleEs = structured.title?.es || 'Receta sin título';
    const slug = generateSlug(titleEs);

    let imageResult = null;
    if (generateImage) {
      try {
        imageResult = await generateRecipeImage(titleEs, apiKey);
      } catch (imgErr) {
        console.warn('[Ingest] Failed to generate image:', imgErr.message);
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
      source_type: req.body.sourceType || 'manual',
      source_reference: req.body.sourceReference || null,
      status: 'draft'
    };

    saveIngestLog(recipeData);

    const recipe = await Recipe.create(recipeData);

    res.status(200).json({
      status: 'processed',
      recipe: recipe.toJSON(),
      tripleCheck: buildTripleCheckMenu(recipeData)
    });
  } catch (error) {
    next(error);
  }
});

function getGroqKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not configured');
  return key;
}

router.post('/transcribe', async (req, res, next) => {
  try {
    const groqKey = getGroqKey();
    const { audioUrl, language = 'es' } = req.body;

    if (!audioUrl) {
      return res.status(400).json({ error: 'audioUrl is required.' });
    }

    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error(`Failed to download audio: ${audioRes.status}`);
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    const transcribedText = await transcribeAudio(audioBuffer, groqKey, language);

    if (!transcribedText.trim()) {
      return res.status(400).json({ error: 'No text could be transcribed from audio.' });
    }

    res.status(200).json({ transcribedText });
  } catch (error) {
    next(error);
  }
});

router.post('/voice', async (req, res, next) => {
  try {
    const groqKey = getGroqKey();
    const { audioUrl, language = 'es' } = req.body;

    if (!audioUrl) {
      return res.status(400).json({ error: 'audioUrl is required.' });
    }

    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error(`Failed to download audio: ${audioRes.status}`);
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    const transcribedText = await transcribeAudio(audioBuffer, groqKey, language);

    if (!transcribedText.trim()) {
      return res.status(400).json({ error: 'No text could be transcribed from audio.' });
    }

    const nvidiaKey = getApiKey();
    const structured = await analyzeAndStructureRecipe(transcribedText, nvidiaKey);

    const titleEs = structured.title?.es || 'Receta sin título';
    const slug = generateSlug(titleEs);

    let imageResult = null;
    try {
      imageResult = await generateRecipeImage(titleEs, nvidiaKey);
    } catch (imgErr) {
      console.warn('[Ingest] Failed to generate image:', imgErr.message);
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
      source_type: 'audio',
      source_reference: audioUrl,
      status: 'draft'
    };

    saveIngestLog(recipeData);

    const recipe = await Recipe.create(recipeData);

    res.status(200).json({
      status: 'processed',
      recipe: recipe.toJSON(),
      transcribedText,
      tripleCheck: buildTripleCheckMenu(recipeData)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:slug/:action', async (req, res, next) => {
  try {
    const { slug, action } = req.params;

    const recipe = await Recipe.findOne({ where: { slug } });
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }

    switch (action) {
      case 'publish': {
        recipe.status = 'published';
        await recipe.save();
        return res.json({ status: 'published', recipe });
      }

      case 'post': {
        recipe.status = req.body.status || 'published';
        if (req.body.title_es) recipe.title_es = req.body.title_es;
        if (req.body.title_en) recipe.title_en = req.body.title_en;
        if (req.body.ingredients) recipe.ingredients = req.body.ingredients;
        if (req.body.steps) recipe.steps = req.body.steps;
        if (req.body.sibo_risk_level) recipe.sibo_risk_level = req.body.sibo_risk_level;
        await recipe.save();
        return res.json({ status: 'saved', recipe });
      }

      case 'csv': {
        const csv = buildCSVRow(recipe);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${recipe.slug}.csv"`);
        return res.send(csv);
      }

      case 'curl': {
        const curlCmd = buildCurlCommand(recipe);
        return res.json({ curl: curlCmd, recipe });
      }

      default:
        return res.status(400).json({ error: 'Invalid action. Use: publish, post, csv, or curl.' });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/save', async (req, res, next) => {
  try {
    const recipeData = req.body;

    if (!recipeData.title_es || !recipeData.title_en) {
      return res.status(400).json({ error: 'title_es and title_en are required.' });
    }

    const slug = recipeData.slug || generateSlug(recipeData.title_es);

    const existing = await Recipe.findOne({ where: { slug } });
    if (existing) {
      Object.assign(existing, recipeData);
      await existing.save();
      return res.json({ status: 'updated', recipe: existing });
    }

    const recipe = await Recipe.create({ ...recipeData, slug });
    return res.status(201).json({ status: 'created', recipe });
  } catch (error) {
    next(error);
  }
});

router.get('/logs', (req, res) => {
  const logsDir = path.join(__dirname, '..', 'ingest_logs');

  if (!fs.existsSync(logsDir)) {
    return res.json({ logs: [] });
  }

  const files = fs.readdirSync(logsDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, 50);

  const logs = files.map(filename => {
    try {
      const content = fs.readFileSync(path.join(logsDir, filename), 'utf-8');
      return { filename, data: JSON.parse(content) };
    } catch {
      return { filename, error: 'Failed to parse' };
    }
  });

  res.json({ logs });
});

function buildTripleCheckMenu(recipe) {
  return {
    message: 'Receta procesada. Elige una acción:',
    options: [
      {
        key: 'A',
        label: '🚀 POST',
        description: 'Inserción directa en PostgreSQL',
        action: `/api/ingest/${recipe.slug}/post`
      },
      {
        key: 'B',
        label: '📄 CSV',
        description: 'Generar archivo CSV',
        action: `/api/ingest/${recipe.slug}/csv`
      },
      {
        key: 'C',
        label: '🛠️ Postman',
        description: 'Obtener JSON/cURL listo para editar',
        action: `/api/ingest/${recipe.slug}/curl`
      }
    ]
  };
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
  const apiUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `curl -X POST ${apiUrl}/api/ingest/save \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(recipe, null, 2)}'`;
}

export default router;
