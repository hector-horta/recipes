import { Recipe } from '../models/Recipe.js';
import {
  extractTextFromImage,
  extractTextFromBase64,
  extractTextFromTwoImages,
  extractTextFromTwoBase64,
  analyzeAndStructureRecipe,
  generateRecipeImage
} from '../services/NvidiaNIM.js';
import { transcribeAudio } from '../services/GroqWhisper.js';
import { saveIngestLog } from '../middleware/recoveryLogger.js';
import { RecipeProvider } from '../services/RecipeProvider.js';
import { TagService } from '../services/TagService.js';
import { ActivityLogger } from '../services/ActivityLogger.js';
import { sanitizeStructuredRecipe } from '../utils/ingestSanitizer.js';
import { validateExternalUrl } from '../utils/urlValidator.js';
import { config } from '../config/env.js';
import {
  generateSlug,
  buildTripleCheckMenu
} from '../utils/ingestHelpers.js';

function getApiKey() {
  const key = config.NVIDIA_API_KEY;
  if (!key) throw new Error('NVIDIA_API_KEY not configured');
  return key;
}

function getGroqKey() {
  const key = config.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not configured');
  return key;
}

export class IngestionService {
  static getAuthorizedOrgId(user, bodyOrgId) {
    if (!user || user.role === 'super_admin') {
      return bodyOrgId !== undefined ? bodyOrgId : (user?.organization_id || null);
    }
    const targetOrgId = bodyOrgId !== undefined ? bodyOrgId : user.organization_id;
    if (targetOrgId !== null && targetOrgId !== user.organization_id) {
      return user.organization_id;
    }
    return targetOrgId;
  }

  static async processAndSaveRecipe({
    structured,
    rawText,
    generateImage,
    saveToDb,
    sourceType,
    sourceReference,
    user,
    ip,
    adminKeyFingerprint,
    bodyOrgId
  }) {
    if (structured.tags && structured.tags.length > 0) {
      await TagService.upsertTags(structured.tags);
    }

    const titleEs = structured.title?.es || 'Receta sin título';
    const slug = generateSlug(titleEs);
    const apiKey = getApiKey();

    let imageResult = null;
    if (generateImage && (saveToDb || sourceType !== 'audio')) {
      try {
        imageResult = await generateRecipeImage(structured.title?.en || titleEs, apiKey, '', structured);
      } catch (imgErr) {
        ActivityLogger.warn('[Ingest] Failed to generate image', { error: imgErr.message, title: titleEs });
      }
    }

    const recipeData = {
      title_es: titleEs,
      title_en: structured.title?.en || titleEs,
      slug,
      prep_time_minutes: structured.prepTimeMinutes,
      cook_time_minutes: structured.cookTimeMinutes,
      servings: structured.servings,
      difficulty: structured.difficulty,
      ingredients: structured.ingredients,
      steps: structured.steps,
      tags: structured.tags,
      image_url: imageResult?.url || null,
      image_filename: imageResult?.filename || null,
      sibo_risk_level: structured.siboRiskLevel,
      sibo_alerts: structured.siboAlerts,
      source_type: sourceType,
      source_reference: sourceReference,
      organization_id: this.getAuthorizedOrgId(user, bodyOrgId),
      status: saveToDb ? 'published' : 'draft'
    };

    if (!saveToDb) {
      if (sourceType === 'audio') {
        ActivityLogger.log('INGEST_SUCCESS', {
          source_type: sourceType,
          title_es: recipeData.title_es,
          saveToDb: false,
          adminKeyFingerprint
        }, {
          userId: user?.id || null,
          ip
        });
      }
      return {
        status: 'processed',
        recipe: recipeData,
        rawText,
        saveToDb: false
      };
    }

    saveIngestLog(recipeData);

    const existing = await Recipe.findOne({ where: { slug } });
    if (existing) {
      const err = new Error('Recipe already exists');
      err.status = 409;
      err.conflict = true;
      err.recipe = recipeData;
      throw err;
    }

    const recipe = await Recipe.create(recipeData);
    await RecipeProvider.clearCache();

    ActivityLogger.log('INGEST_SUCCESS', {
      source_type: sourceType,
      title_es: recipeData.title_es,
      saveToDb: true,
      adminKeyFingerprint
    }, {
      userId: user?.id || null,
      ip
    });

    return {
      status: 'processed',
      recipe: recipe.toJSON(),
      rawText,
      tripleCheck: buildTripleCheckMenu(recipeData)
    };
  }

  static async ingestImage({ imageUrl, imageBase64, mimeType, generateImage, saveToDb, user, ip, adminKeyFingerprint, bodyOrgId }) {
    const apiKey = getApiKey();
    let rawText = '';
    if (imageBase64) {
      rawText = await extractTextFromBase64(imageBase64, mimeType || 'image/png', apiKey);
    } else if (imageUrl) {
      rawText = await extractTextFromImage(imageUrl, apiKey);
    } else {
      const error = new Error('Debe proporcionar imageUrl o imageBase64.');
      error.status = 400;
      throw error;
    }

    if (!rawText.trim()) {
      const error = new Error('No text could be extracted from the image.');
      error.status = 400;
      throw error;
    }

    const structuredRaw = await analyzeAndStructureRecipe(rawText, apiKey);
    const structured = await sanitizeStructuredRecipe(structuredRaw);

    return this.processAndSaveRecipe({
      structured,
      rawText,
      generateImage,
      saveToDb,
      sourceType: 'ocr_image',
      sourceReference: imageUrl || null,
      user,
      ip,
      adminKeyFingerprint,
      bodyOrgId
    });
  }

  static async ingestImages({ imageUrl1, imageUrl2, imageBase64_1, mimeType1, imageBase64_2, mimeType2, generateImage, saveToDb, user, ip, adminKeyFingerprint, bodyOrgId }) {
    const apiKey = getApiKey();
    let rawText = '';
    if (imageBase64_1 && imageBase64_2) {
      ActivityLogger.info('Processing dual images from base64 for dual ingest');
      rawText = await extractTextFromTwoBase64(imageBase64_1, mimeType1 || 'image/png', imageBase64_2, mimeType2 || 'image/png', apiKey);
    } else if (imageUrl1 && imageUrl2) {
      ActivityLogger.info('Processing dual images from URLs for dual ingest', { imageUrl1, imageUrl2 });
      rawText = await extractTextFromTwoImages(imageUrl1, imageUrl2, apiKey);
    }

    if (!rawText.trim()) {
      const error = new Error('No text could be extracted from the images.');
      error.status = 400;
      throw error;
    }

    const structuredRaw = await analyzeAndStructureRecipe(rawText, apiKey);
    const structured = await sanitizeStructuredRecipe(structuredRaw);

    return this.processAndSaveRecipe({
      structured,
      rawText,
      generateImage,
      saveToDb,
      sourceType: 'ocr_image',
      sourceReference: `multi_image:${imageUrl1 || ''},${imageUrl2 || ''}`,
      user,
      ip,
      adminKeyFingerprint,
      bodyOrgId
    });
  }

  static async ingestText({ text, generateImage, saveToDb, sourceType, sourceReference, user, ip, adminKeyFingerprint, bodyOrgId }) {
    const apiKey = getApiKey();
    const structuredRaw = await analyzeAndStructureRecipe(text, apiKey);
    const structured = await sanitizeStructuredRecipe(structuredRaw);

    return this.processAndSaveRecipe({
      structured,
      rawText: text,
      generateImage,
      saveToDb,
      sourceType: sourceType || 'manual',
      sourceReference: sourceReference || null,
      user,
      ip,
      adminKeyFingerprint,
      bodyOrgId
    });
  }

  static async transcribeAudio({ audioUrl, language, user, ip, adminKeyFingerprint }) {
    const groqKey = getGroqKey();
    validateExternalUrl(audioUrl, ['telegram.org', 'api.telegram.org', 'cloudfront.net', 'amazonaws.com']);

    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error(`Failed to download audio: ${audioRes.status}`);
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    const transcribedText = await transcribeAudio(audioBuffer, groqKey, language);
    if (!transcribedText.trim()) {
      const error = new Error('No text could be transcribed from audio.');
      error.status = 400;
      throw error;
    }

    ActivityLogger.log('ADMIN_ACTION', {
      action: 'transcribe',
      audioUrl,
      language,
      adminKeyFingerprint
    }, {
      userId: user?.id || null,
      ip
    });

    return { transcribedText };
  }

  static async ingestVoice({ audioUrl, language, saveToDb, user, ip, adminKeyFingerprint, bodyOrgId }) {
    const groqKey = getGroqKey();
    validateExternalUrl(audioUrl, ['telegram.org', 'api.telegram.org', 'cloudfront.net', 'amazonaws.com']);

    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error(`Failed to download audio: ${audioRes.status}`);
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    const transcribedText = await transcribeAudio(audioBuffer, groqKey, language);
    if (!transcribedText.trim()) {
      const error = new Error('No text could be transcribed from audio.');
      error.status = 400;
      throw error;
    }

    const nvidiaKey = getApiKey();
    const structuredRaw = await analyzeAndStructureRecipe(transcribedText, nvidiaKey);
    const structured = await sanitizeStructuredRecipe(structuredRaw);

    return this.processAndSaveRecipe({
      structured,
      rawText: transcribedText,
      generateImage: saveToDb,
      saveToDb,
      sourceType: 'audio',
      sourceReference: audioUrl,
      user,
      ip,
      adminKeyFingerprint,
      bodyOrgId
    });
  }
}
