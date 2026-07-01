import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Recipe } from '../models/Recipe.js';
import { generateRecipeImage } from '../services/NvidiaNIM.js';
import { RecipeProvider } from '../services/RecipeProvider.js';
import { TagService } from '../services/TagService.js';
import { ActivityLogger } from '../services/ActivityLogger.js';
import { sanitizeStructuredRecipe } from '../utils/ingestSanitizer.js';
import { config } from '../config/env.js';
import {
  generateSlug,
  buildCSVRow,
  buildCurlCommand
} from '../utils/ingestHelpers.js';
import { IngestionService } from './IngestionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getApiKey() {
  const key = config.NVIDIA_API_KEY;
  if (!key) throw new Error('NVIDIA_API_KEY not configured');
  return key;
}

export class RecipeActionService {
  static async executeRecipeAction({ slugOrId, action, issue, user, ip, adminKeyFingerprint }) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
    const whereClause = isUuid ? { id: slugOrId } : { slug: slugOrId };

    const recipe = await Recipe.findOne({ where: whereClause });
    if (!recipe) {
      const error = new Error('Recipe not found.');
      error.status = 404;
      throw error;
    }

    switch (action) {
      case 'publish':
        recipe.status = 'published';
        await recipe.save();
        await RecipeProvider.clearCache();
        ActivityLogger.log('ADMIN_ACTION', { action: 'publish', recipeId: recipe.id, slug: recipe.slug, adminKeyFingerprint }, { userId: user?.id || null, ip });
        return { status: 'published', recipe };

      case 'post':
        recipe.status = 'published';
        await recipe.save();
        await RecipeProvider.clearCache();
        ActivityLogger.log('ADMIN_ACTION', { action: 'post', recipeId: recipe.id, slug: recipe.slug, adminKeyFingerprint }, { userId: user?.id || null, ip });
        return { status: 'posted', recipe };

      case 'csv':
        ActivityLogger.log('ADMIN_ACTION', { action: 'csv', recipeId: recipe.id, slug: recipe.slug, adminKeyFingerprint }, { userId: user?.id || null, ip });
        return {
          type: 'csv',
          filename: `${recipe.slug}.csv`,
          data: buildCSVRow(recipe.toJSON())
        };

      case 'curl':
        ActivityLogger.log('ADMIN_ACTION', { action: 'curl', recipeId: recipe.id, slug: recipe.slug, adminKeyFingerprint }, { userId: user?.id || null, ip });
        return {
          type: 'curl',
          command: buildCurlCommand(recipe.toJSON())
        };

      case 'refresh-image': {
        const apiKey = getApiKey();
        const feedback = issue || '';

        ActivityLogger.info('Regenerating image for recipe', { slug: recipe.slug, feedback });

        try {
          if (recipe.image_filename) {
            const oldPath = path.join(__dirname, '..', 'public', 'recipes', recipe.image_filename);
            if (fs.existsSync(oldPath)) {
              try {
                fs.unlinkSync(oldPath);
                ActivityLogger.info('Deleted old recipe image', { path: oldPath });
              } catch (unlinkErr) {
                ActivityLogger.warn('Failed to delete old image', { error: unlinkErr.message });
              }
            }
          }

          const imageResult = await generateRecipeImage(recipe.title_en, apiKey, feedback, recipe.toJSON());

          recipe.image_url = imageResult.url;
          recipe.image_filename = imageResult.filename;
          await recipe.save();

          await RecipeProvider.clearCache();
          ActivityLogger.log('ADMIN_ACTION', { action: 'refresh-image', recipeId: recipe.id, slug: recipe.slug, adminKeyFingerprint }, { userId: user?.id || null, ip });

          return { status: 'image_refreshed', recipe };
        } catch (imgErr) {
          ActivityLogger.error('Failed to regenerate image', { error: imgErr.message, slug: recipe.slug });
          const error = new Error(`Error regenerando imagen: ${imgErr.message}`);
          error.status = 500;
          throw error;
        }
      }

      default:
        const error = new Error('Invalid action. Use: publish, post, csv, curl, or refresh-image.');
        error.status = 400;
        throw error;
    }
  }

  static async saveRecipe({ recipeData, status = 'published', generateImage = false, user, ip, adminKeyFingerprint, bodyOrgId }) {
    if (!recipeData.title_es || !recipeData.title_en) {
      const error = new Error('title_es and title_en are required.');
      error.status = 400;
      throw error;
    }

    const slug = recipeData.slug || generateSlug(recipeData.title_es);

    const sanitized = await sanitizeStructuredRecipe({
      ...recipeData,
      title: { es: recipeData.title_es, en: recipeData.title_en }
    });

    if (sanitized.tags && sanitized.tags.length > 0) {
      await TagService.upsertTags(sanitized.tags);
    }

    const finalData = {
      title_es: sanitized.title.es,
      title_en: sanitized.title.en,
      slug: slug,
      prep_time_minutes: sanitized.prepTimeMinutes,
      cook_time_minutes: sanitized.cookTimeMinutes,
      servings: sanitized.servings,
      difficulty: sanitized.difficulty,
      ingredients: sanitized.ingredients,
      steps: sanitized.steps,
      tags: sanitized.tags,
      image_url: recipeData.image_url,
      image_filename: recipeData.image_filename,
      sibo_risk_level: sanitized.siboRiskLevel,
      sibo_alerts: sanitized.siboAlerts,
      source_type: recipeData.source_type || 'manual',
      source_reference: recipeData.source_reference,
      organization_id: IngestionService.getAuthorizedOrgId(user, bodyOrgId),
      status: status
    };

    const apiKey = getApiKey();
    let imageResult = null;

    if (generateImage && !finalData.image_url) {
      try {
        imageResult = await generateRecipeImage(finalData.title_en, apiKey, '', finalData);
        finalData.image_url = imageResult.url;
        finalData.image_filename = imageResult.filename;
      } catch (imgErr) {
        ActivityLogger.warn('Image generation failed during manual save', { error: imgErr.message });
      }
    }

    const existing = await Recipe.findOne({ where: { slug } });
    if (existing) {
      Object.assign(existing, finalData);
      await existing.save();
      await RecipeProvider.clearCache();
      ActivityLogger.log('ADMIN_ACTION', { action: 'save-update', recipeId: existing.id, slug: existing.slug, adminKeyFingerprint }, { userId: user?.id || null, ip });
      return { status: 'updated', recipe: existing };
    }

    const recipe = await Recipe.create(finalData);
    await RecipeProvider.clearCache();
    ActivityLogger.log('ADMIN_ACTION', { action: 'save-create', recipeId: recipe.id, slug: recipe.slug, adminKeyFingerprint }, { userId: user?.id || null, ip });
    return { status: 'created', recipe };
  }

  static async getLogs(logsDir) {
    if (!fs.existsSync(logsDir)) {
      return { logs: [] };
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

    return { logs };
  }
}
