import { Router } from 'express';
import { SearchLog } from '../models/SearchLog.js';
import { ActivityLogger } from '../services/ActivityLogger.js';
import { User } from '../models/User.js';
import rateLimit from 'express-rate-limit';
import { requireAdminKey } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const suggestionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 suggestions per hour
  message: { error: 'Demasiadas sugerencias. Intenta de nuevo más tarde.' }
});

import { config } from '../config/env.js';
import { z } from 'zod';

const suggestionSchema = z.object({
  term: z.string().trim().min(2, 'term is required (min 2 characters)'),
  userId: z.string().uuid().optional().nullable()
});

router.post('/', suggestionLimiter, asyncHandler(async (req, res) => {
  const { term: cleanTerm, userId } = suggestionSchema.parse(req.body);
  const validUserId = userId || null;

  let userInfo = 'guest';
  if (validUserId) {
    const user = await User.findByPk(validUserId, { attributes: ['display_name', 'email'] });
    if (user) {
      userInfo = `${user.display_name} (${user.email})`;
    }
  }

  // Fachada unificada: se encarga de Database (SearchLog + ActivityLog), Telegram y Umami
  ActivityLogger.log('SUGGEST_TO_CHEF', 
    { term: cleanTerm, userInfo }, 
    { userId: validUserId, ip: req.ip }
  );

  res.status(201).json({
    message: 'Suggestion recorded',
    term: cleanTerm
  });
}));

router.get('/stats', requireAdminKey, asyncHandler(async (req, res) => {
  const { Op } = await import('sequelize');
  const totalFailed = await SearchLog.count({ where: { status: 'failed' } });
  const totalSuggested = await SearchLog.count({ where: { status: 'suggested' } });
  const conversionRate = totalFailed > 0
    ? ((totalSuggested / (totalFailed + totalSuggested)) * 100).toFixed(1)
    : 0;

  const recentTerms = await SearchLog.findAll({
    where: { status: 'failed' },
    order: [['created_at', 'DESC']],
    limit: 20,
    attributes: ['term', 'created_at']
  });

  res.json({
    totalFailed,
    totalSuggested,
    conversionRate: `${conversionRate}%`,
    recentFailedTerms: recentTerms.map(r => ({
      term: r.term,
      date: r.created_at
    }))
  });
}));

export default router;
