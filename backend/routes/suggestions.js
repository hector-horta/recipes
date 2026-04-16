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

const TELEGRAM_USER_ID = config.TELEGRAM_USER_ID;
const TELEGRAM_BOT_TOKEN = config.TELEGRAM_BOT_TOKEN;

async function sendTelegramSuggestion(term, userId) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_USER_ID) {
    ActivityLogger.warn('[Suggestions] Telegram not configured, skipping notification.');
    return;
  }

  let userInfo = 'anonymous';
  if (userId) {
    try {
      const user = await User.findByPk(userId, { attributes: ['display_name', 'email'] });
      if (user) {
        const name = user.display_name || 'No Name';
        const email = user.email || 'No Email';
        userInfo = `${name} (${email})`;
        ActivityLogger.info(`[Suggestions] Found user for suggestion: ${userInfo}`, { userId });
      } else {
        ActivityLogger.warn(`[Suggestions] User ID ${userId} provided but user not found in DB`, { userId });
      }
    } catch (err) {
      ActivityLogger.error('[Suggestions] Failed to fetch user info for userId: ' + userId, err);
    }
  } else {
    ActivityLogger.info('[Suggestions] Processing anonymous suggestion (no userId provided)');
  }

  const message =
    `👨‍🍳 *Chef Suggestion*\n\n` +
    `A user searched for *"${term}"* and wants the recipe.\n\n` +
    `👤 *User:* ${userInfo}`;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_USER_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      }
    );

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      ActivityLogger.error(`[Suggestions] Telegram API error (${res.status})`, err);
    }
  } catch (err) {
    ActivityLogger.error('[Suggestions] Telegram fetch failed', err);
  }
}

import { z } from 'zod';
import { optionalAuthenticateToken } from '../middleware/auth.js';

const suggestionSchema = z.object({
  term: z.string().trim().min(2, 'term is required (min 2 characters)'),
  userId: z.string().uuid().optional().nullable()
});

router.post('/', optionalAuthenticateToken, suggestionLimiter, asyncHandler(async (req, res) => {
  const { term: cleanTerm, userId: bodyUserId } = suggestionSchema.parse(req.body);
  
  // Priority: 1. Authenticated user from token, 2. provided userId in body
  const effectiveUserId = req.user?.id || bodyUserId || null;
  const validUserId = effectiveUserId;
  
  ActivityLogger.info('[Suggestions] Processing suggestion', { 
    term: cleanTerm, 
    userIdFromToken: req.user?.id, 
    userIdFromBody: bodyUserId,
    effectiveUserId 
  });

  const searchLog = await SearchLog.create({
    term: cleanTerm,
    status: 'suggested',
    conversion: true,
    user_id: validUserId,
    ip: req.ip
  });

  ActivityLogger.log('SUGGEST_TO_CHEF', { term: cleanTerm }, {
    userId: validUserId,
    ip: req.ip
  });

  // Background task, don't await to avoid blocking response
  sendTelegramSuggestion(cleanTerm, validUserId).catch(err => {
    ActivityLogger.error('[Suggestions] Telegram background task failed', err);
  });

  res.status(201).json({
    message: 'Suggestion recorded',
    searchLog: {
      id: searchLog.id,
      term: searchLog.term,
      status: searchLog.status,
      conversion: searchLog.conversion
    }
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
