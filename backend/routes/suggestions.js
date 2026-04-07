import { Router } from 'express';
import { SearchLog } from '../models/SearchLog.js';
import { ActivityLogger } from '../services/ActivityLogger.js';

const router = Router();

const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramSuggestion(term, userId) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_USER_ID) {
    console.warn('[Suggestions] Telegram not configured, skipping notification.');
    return;
  }

  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(term + ' recipe')}`;
  const message =
    `👨‍🍳 *Chef Suggestion*\n\n` +
    `A user searched for *"${term}"* and wants the recipe.\n\n` +
    `🔍 [Search on Google](${googleSearchUrl})\n` +
    `👤 User ID: \`${userId || 'anonymous'}\``;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_USER_ID,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: false
        })
      }
    );

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error(`[Suggestions] Telegram API error (${res.status}):`, err);
    }
  } catch (err) {
    console.error('[Suggestions] Telegram fetch failed:', err.message);
  }
}

router.post('/', async (req, res) => {
  try {
    const { term, userId } = req.body;

    if (!term || typeof term !== 'string' || term.trim().length < 2) {
      return res.status(400).json({ error: 'term is required (min 2 characters)' });
    }

    const cleanTerm = term.trim();
    const validUserId = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
      ? userId
      : null;

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

    sendTelegramSuggestion(cleanTerm, validUserId);

    res.status(201).json({
      message: 'Suggestion recorded',
      searchLog: {
        id: searchLog.id,
        term: searchLog.term,
        status: searchLog.status,
        conversion: searchLog.conversion
      }
    });
  } catch (error) {
    console.error('[Suggestions] Error:', error.message);
    res.status(500).json({ error: 'Failed to record suggestion' });
  }
});

router.get('/stats', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('[Suggestions Stats] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
