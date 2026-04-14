import express from 'express';
import { RecipeProvider } from '../services/RecipeProvider.js';
import { optionalAuthenticateToken } from '../middleware/auth.js';
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
  const params = req.validatedQuery;
  let userProfile = null;
  if (req.user) {
    userProfile = await Profile.findOne({ where: { user_id: req.user.id } });
    if (userProfile) {
       ActivityLogger.info(`Profile loaded for user ${req.user.id}`, { 
         intolerances: userProfile.intolerances, 
         severities: userProfile.severities 
       });
    }
  }

  const { query } = params;
  const plainProfile = userProfile ? userProfile.get({ plain: true }) : null;
  const data = await RecipeProvider.getRecipes(params, plainProfile);

  // Telemetría
  const searchTerms = query?.trim() || '';
  const isEmpty = !data.recipes || data.recipes.length === 0;

  if (searchTerms.length >= 3) {
    ActivityLogger.log('SEARCH', { query: searchTerms }, {
      userId: req.user?.id || null,
      ip: req.ip,
      failedSearch: isEmpty
    });
  }

  const userIntolerances = userProfile?.intolerances || [];
  if (userIntolerances.length > 0) {
    ActivityLogger.log('SEARCH', {
      query: query || '(browse)',
      filteredByIntolerances: userIntolerances,
      resultsAfterFilter: data.recipes.length,
      filteredUnsafeCount: data.filteredUnsafeCount
    }, {
      userId: req.user?.id || null,
      ip: req.ip,
      failedSearch: false
    });
  }

  res.json(data);
}));

export default router;
