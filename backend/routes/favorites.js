import express from 'express';
import { FavoriteRecipe } from '../models/FavoriteRecipe.js';
import { authenticateToken } from '../middleware/auth.js';
import { ActivityLogger } from '../services/ActivityLogger.js';


const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const favorites = await FavoriteRecipe.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(favorites);
  } catch (error) {
    console.error('[Favorites] Error fetching:', error);
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { recipeId, title, image } = req.body;

  if (!recipeId || !title) {
    return res.status(400).json({ error: 'Recipe ID y Título son requeridos' });
  }

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
    console.error('[Favorites] Error toggling:', error);
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
    console.error('[Favorites] Error deleting:', error);
    res.status(500).json({ error: 'Error al eliminar favorito' });
  }
});

export default router;
