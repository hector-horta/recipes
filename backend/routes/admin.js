import express from 'express';
import { Op, fn, col, literal } from 'sequelize';
import { ActivityLog } from '../models/ActivityLog.js';
import { FavoriteRecipe } from '../models/FavoriteRecipe.js';

const router = express.Router();

import { config } from '../config/env.js';

import { requireAdminKey } from '../middleware/auth.js';

/**
 * GET /admin/stats
 *
 * Devuelve:
 *  - top_searches:           5 términos más buscados en los últimos 7 días
 *  - failed_searches:        10 búsquedas sin resultados (últimos 7 días)
 *  - low_conversion_recipes: 3 recetas con más vistas pero menos favoritos
 *  - nvidia:                 uptime estimado de NVIDIA APIs (últimas 24h)
 *  - ingest_by_day:          recetas procesadas por día (últimos 7 días)
 */
router.get('/stats', requireAdminKey, async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo   = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // ── 1. Top 5 búsquedas exitosas (7 días) ────────────────────────────────
    const topSearches = await ActivityLog.findAll({
      where: {
        action: 'SEARCH',
        failed_search: false,
        created_at: { [Op.gte]: sevenDaysAgo }
      },
      attributes: [
        [fn('lower', literal("metadata->>'query'")), 'term'],
        [fn('count', col('id')), 'count']
      ],
      group: [literal("lower(metadata->>'query')")],
      order: [[literal('count'), 'DESC']],
      limit: 5,
      raw: true
    });

    // ── 2. Búsquedas fallidas (sin resultados) últimos 7 días ───────────────
    const failedSearches = await ActivityLog.findAll({
      where: {
        action: 'SEARCH',
        failed_search: true,
        created_at: { [Op.gte]: sevenDaysAgo }
      },
      attributes: [
        [literal("metadata->>'query'"), 'term'],
        [fn('count', col('id')), 'count']
      ],
      group: [literal("metadata->>'query'")],
      order: [[literal('count'), 'DESC']],
      limit: 10,
      raw: true
    });

    // ── 3. Recetas con más vistas pero menos favoritos (baja conversión) ─────
    const topViewed = await ActivityLog.findAll({
      where: {
        action: 'VIEW_RECIPE',
        created_at: { [Op.gte]: sevenDaysAgo }
      },
      attributes: [
        [literal("metadata->>'recipeId'"), 'recipe_id'],
        [literal("metadata->>'title'"),    'title'],
        [fn('count', col('id')),           'views']
      ],
      group: [
        literal("metadata->>'recipeId'"),
        literal("metadata->>'title'")
      ],
      order: [[literal('views'), 'DESC']],
      limit: 20,
      raw: true
    });

    // Enriquecer con conteo de favoritos
    const recipeIds = topViewed.map(r => r.recipe_id).filter(Boolean);
    let favoriteCounts = {};

    if (recipeIds.length > 0) {
      const favRows = await FavoriteRecipe.findAll({
        where: { recipe_id: { [Op.in]: recipeIds } },
        attributes: [
          'recipe_id',
          [fn('count', col('id')), 'fav_count']
        ],
        group: ['recipe_id'],
        raw: true
      });
      favRows.forEach(f => {
        favoriteCounts[f.recipe_id] = parseInt(f.fav_count, 10);
      });
    }

    const lowConversionRecipes = topViewed
      .map(r => ({
        recipe_id:      r.recipe_id,
        title:          r.title,
        views:          parseInt(r.views, 10),
        favorites:      favoriteCounts[r.recipe_id] || 0,
        conversionRate: parseFloat(
          ((favoriteCounts[r.recipe_id] || 0) / parseInt(r.views, 10)).toFixed(4)
        )
      }))
      .sort((a, b) => a.conversionRate - b.conversionRate)
      .slice(0, 3);

    // ── 4. Uptime NVIDIA (últimas 24h) ───────────────────────────────────────
    const [nvidiaSuccess, nvidiaFail] = await Promise.all([
      ActivityLog.count({
        where: { action: 'INGEST_SUCCESS', created_at: { [Op.gte]: oneDayAgo } }
      }),
      ActivityLog.count({
        where: { action: 'INGEST_FAIL', created_at: { [Op.gte]: oneDayAgo } }
      })
    ]);

    const totalNvidia = nvidiaSuccess + nvidiaFail;
    const nvidiaUptime = totalNvidia > 0
      ? parseFloat(((nvidiaSuccess / totalNvidia) * 100).toFixed(1))
      : null;

    // ── 5. Ingestas por día (7 días) ─────────────────────────────────────────
    const ingestByDay = await ActivityLog.findAll({
      where: {
        action:     { [Op.in]: ['INGEST_SUCCESS', 'INGEST_FAIL'] },
        created_at: { [Op.gte]: sevenDaysAgo }
      },
      attributes: [
        [fn('date', col('created_at')), 'day'],
        'action',
        [fn('count', col('id')),       'count']
      ],
      group: [fn('date', col('created_at')), 'action'],
      order: [[fn('date', col('created_at')), 'ASC']],
      raw: true
    });

    res.json({
      generated_at:           new Date().toISOString(),
      top_searches:           topSearches,
      failed_searches:        failedSearches,
      low_conversion_recipes: lowConversionRecipes,
      nvidia: {
        uptime_percent_24h:   nvidiaUptime,
        success_24h:          nvidiaSuccess,
        failures_24h:         nvidiaFail
      },
      ingest_by_day:          ingestByDay
    });

  } catch (error) {
    console.error('[Admin] Stats error:', error);
    res.status(500).json({ error: 'Error generating stats' });
  }
});

export default router;
