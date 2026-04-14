import express from 'express';
import { z } from 'zod';
import { FavoriteRecipe, associateWithRecipe } from '../models/FavoriteRecipe.js';
import { Recipe } from '../models/Recipe.js';
import { authenticateToken } from '../middleware/auth.js';
import { ActivityLogger } from '../services/ActivityLogger.js';

// Initialize association once
associateWithRecipe(Recipe);

const router = express.Router();

const favoriteSchema = z.object({
  recipeId: z.string().uuid('ID de receta inválido'),
  title: z.string().min(1, 'El título es requerido'),
  image: z.string().url('URL de imagen inválida').optional().or(z.string().nullable())
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const favorites = await FavoriteRecipe.findAll({
      where: { user_id: req.user.id },
      include: [{ 
        model: Recipe, 
        as: 'recipe', 
        attributes: ['id', 'title_es', 'title_en', 'ingredients', 'steps', 'prep_time_minutes', 'cook_time_minutes', 'sibo_risk_level', 'sibo_alerts', 'tags', 'image_url', 'image_filename'] 
      }],
      order: [['created_at', 'DESC']]
    });
    res.json(favorites);
  } catch (error) {
    ActivityLogger.error('[Favorites] Error fetching', error);
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const parseResult = favoriteSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Datos de favorito inválidos', details: parseResult.error.errors });
  }
  
  const { recipeId, title, image } = parseResult.data;

  try {
    const existing = await FavoriteRecipe.findOne({
      where: { 
        user_id: req.user.id,
        recipe_id: recipeId
      }
    });

    if (existing) {
      await existing.destroy();
      return res.json({ favorited: false, message: 'Eliminado de favoritos' });
    } else {
      const favorite = await FavoriteRecipe.create({
        user_id: req.user.id,
        recipe_id: recipeId,
        title,
        image
      });
      // ── Telemetría: ADD_FAVORITE ──────────────────────────────────────────
      ActivityLogger.log('ADD_FAVORITE', { recipeId, title }, {
        userId: req.user.id,
        ip: req.ip
      });
      // ───────────────────────────────────────────────────────
      return res.status(201).json({ favorited: true, data: favorite });
    }
  } catch (error) {
    ActivityLogger.error('[Favorites] Error toggling', error);
    res.status(500).json({ error: 'Error al procesar favorito' });
  }
});

router.delete('/:recipeId', authenticateToken, async (req, res) => {
  try {
    const deleted = await FavoriteRecipe.destroy({
      where: { 
        user_id: req.user.id,
        recipe_id: req.params.recipeId
      }
    });

    if (deleted) {
      res.json({ message: 'Eliminado de favoritos' });
    } else {
      res.status(404).json({ error: 'Receta no encontrada en favoritos' });
    }
  } catch (error) {
    ActivityLogger.error('[Favorites] Error deleting', error);
    res.status(500).json({ error: 'Error al eliminar favorito' });
  }
});

export default router;
