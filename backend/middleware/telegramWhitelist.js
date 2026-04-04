export function telegramWhitelist(req, res, next) {
  const allowedUserId = process.env.TELEGRAM_USER_ID;

  if (!allowedUserId) {
    return res.status(500).json({ error: 'TELEGRAM_USER_ID not configured.' });
  }

  const telegramUserId = req.headers['x-telegram-user-id']
    || req.body?.message?.from?.id?.toString()
    || req.body?.from?.id?.toString();

  if (!telegramUserId) {
    return res.status(401).json({ error: 'Telegram user ID not found.' });
  }

  if (telegramUserId !== allowedUserId) {
    console.warn(`[Telegram Whitelist] Blocked user: ${telegramUserId}`);
    return res.status(403).json({ error: 'Access denied. User not authorized.' });
  }

  next();
}
