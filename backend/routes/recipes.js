import express from 'express';
import { RecipeProvider } from '../services/RecipeProvider.js';
import { optionalAuthenticateToken, ensureVerified } from '../middleware/auth.js';
import { Recipe } from '../models/Recipe.js';
import { Profile } from '../models/Profile.js';
import { ActivityLogger } from '../services/ActivityLogger.js';
import rateLimit from 'express-rate-limit';

import { validateQuery } from '../middleware/validate.js';
import { recipeQuerySchema } from '../models/validators.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

const recipeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  limit: 100,
  message: { error: 'Se han agotado las búsquedas permitidas por este dispositivo durante 15 minutos.' }
});

router.get('/', optionalAuthenticateToken, recipeLimiter, validateQuery(recipeQuerySchema), asyncHandler(async (req, res, next) => {
  let userProfile = null;
  if (req.user) {
    userProfile = await Profile.findOne({ where: { user_id: req.user.id } });
  }

  const { query } = params;
  const plainProfile = userProfile ? userProfile.get({ plain: true }) : null;
  const data = await RecipeProvider.getRecipes(params, plainProfile);

  // Telemetría Unificada
  const searchTerms = query?.trim() || '(browse)';
  const isEmpty = !data.recipes || data.recipes.length === 0;
  const userIntolerances = userProfile?.intolerances || [];

  ActivityLogger.log('SEARCH', {
    query: searchTerms,
    resultsCount: data.recipes.length,
    filteredUnsafeCount: data.filteredUnsafeCount,
    intolerances: userIntolerances
  }, {
    userId: req.user?.id || null,
    ip: req.ip,
    failedSearch: isEmpty && searchTerms !== '(browse)'
  });

  res.json(data);
}));

// GET /api/recipes/:id
// CORE ACTION: Viewing details is restricted to verified users.
router.get('/:id', optionalAuthenticateToken, ensureVerified, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const recipe = await Recipe.findByPk(id);
  if (!recipe) {
    return res.status(404).json({ error: 'Receta no encontrada' });
  }

  let userProfile = null;
  if (req.user) {
    userProfile = await Profile.findOne({ where: { user_id: req.user.id } });
  }

  const data = RecipeProvider.normalizeRecipe(recipe.toJSON(), userProfile ? userProfile.get({ plain: true }) : null);
  
  // Track View
  ActivityLogger.log('VIEW_RECIPE', { recipeId: id, title: data.title }, {
    userId: req.user?.id || null,
    ip: req.ip
  });

  res.json(data);
}));

export default router;
