import express from 'express';
import { FavoriteRecipe } from '../models/FavoriteRecipe.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/favorites
 * @desc Get all favorite recipes for the current user
 */
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

/**
 * @route POST /api/favorites
 * @desc Toggle a recipe as favorite
 */
router.post('/', authenticateToken, async (req, res) => {
  const { spoonacularId, title, image } = req.body;

  if (!spoonacularId || !title) {
    return res.status(400).json({ error: 'Spoonacular ID y Título son requeridos' });
  }

  try {
    // Check if already favorited
    const existing = await FavoriteRecipe.findOne({
      where: { 
        user_id: req.user.id,
        spoonacular_id: spoonacularId
      }
    });

    if (existing) {
      // Toggle off: Remove
      await existing.destroy();
      return res.json({ favorited: false, message: 'Eliminado de favoritos' });
    } else {
      // Toggle on: Add
      const favorite = await FavoriteRecipe.create({
        user_id: req.user.id,
        spoonacular_id: spoonacularId,
        title,
        image
      });
      return res.status(201).json({ favorited: true, data: favorite });
    }
  } catch (error) {
    console.error('[Favorites] Error toggling:', error);
    res.status(500).json({ error: 'Error al procesar favorito' });
  }
});

/**
 * @route DELETE /api/favorites/:spoonacularId
 * @desc Remove a recipe from favorites
 */
router.delete('/:spoonacularId', authenticateToken, async (req, res) => {
  try {
    const deleted = await FavoriteRecipe.destroy({
      where: { 
        user_id: req.user.id,
        spoonacular_id: req.params.spoonacularId
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
