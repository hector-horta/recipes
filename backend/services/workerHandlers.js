/**
 * Worker Job Handlers
 * ───────────────────
 * Extracted from worker.js to be independently testable.
 * worker.js imports and wires these into the BullMQ Worker.
 */

import { JOB_TYPES } from '../config/bullmq.js';
import { generateRecipeImage } from '../services/NvidiaNIM.js';
import { config } from '../config/env.js';
import { ActivityLogger } from '../services/ActivityLogger.js';
import { Recipe } from '../models/Recipe.js';
import { RecipeProvider } from '../services/RecipeProvider.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function handleGenerateImage(job) {
  const { recipeId, title, feedback, details } = job.data;
  const apiKey = config.NVIDIA_API_KEY || config.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('No AI API key configured (NVIDIA_API_KEY or GEMINI_API_KEY).');
  }

  ActivityLogger.info('[Worker] Generating image', { recipeId, title: title?.substring(0, 40) });
  await job.updateProgress(10);

  const recipe = await Recipe.findByPk(recipeId);
  if (!recipe) {
    throw new Error(`Recipe ${recipeId} not found.`);
  }

  if (recipe.image_filename) {
    const oldPath = path.join(__dirname, '..', 'public', 'recipes', recipe.image_filename);
    if (fs.existsSync(oldPath)) {
      try {
        fs.unlinkSync(oldPath);
        ActivityLogger.info('[Worker] Deleted old image', { path: oldPath });
      } catch (err) {
        ActivityLogger.warn('[Worker] Failed to delete old image', { error: err.message });
      }
    }
  }

  await job.updateProgress(30);

  const imageResult = await generateRecipeImage(
    title || recipe.title_en,
    apiKey,
    feedback || '',
    details || recipe.toJSON()
  );

  await job.updateProgress(80);

  recipe.image_url = imageResult.url;
  recipe.image_filename = imageResult.filename;
  await recipe.save();
  await RecipeProvider.clearCache();

  await job.updateProgress(100);

  ActivityLogger.info('[Worker] Image generated successfully', {
    recipeId,
    imageUrl: imageResult.url,
  });

  return {
    recipeId,
    imageUrl: imageResult.url,
    filename: imageResult.filename,
  };
}

export async function processJob(job) {
  ActivityLogger.info(`[Worker] Processing job ${job.id} (${job.name})`, {
    attempt: job.attemptsMade + 1,
  });

  switch (job.name) {
    case JOB_TYPES.GENERATE_IMAGE:
      return handleGenerateImage(job);

    default:
      throw new Error(`Unknown job type: ${job.name}`);
  }
}
