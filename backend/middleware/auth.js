import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { ActivityLogger } from '../services/ActivityLogger.js';

const JWT_SECRET = config.JWT_SECRET;
const JWT_ALGO = 'HS256';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Prefer format: "Bearer <token>"
  let token = authHeader && authHeader.split(' ')[1];

  // Fallback to cookie
  if (!token && req.cookies) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGO] }, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado.' });
    }
    // user contains the payload from JWT, typically { id, email }
    req.user = user;
    next();
  });
};

/**
 * ensureVerified — Restricts access to verified users only.
 * Performs a DB check to ensure real-time status.
 */
export const ensureVerified = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Acceso denegado. Se requiere autenticación.' });
  }

  try {
    const user = await User.findByPk(req.user.id, { attributes: ['is_verified'] });
    if (!user || !user.is_verified) {
      return res.status(403).json({ 
        error: 'VALIDATION_REQUIRED',
        message: 'Tu correo electrónico aún no ha sido verificado.',
        details: 'Revisa tu bandeja de entrada o solicita un nuevo enlace de acceso.'
      });
    }
    next();
  } catch (err) {
    ActivityLogger.error('Error in ensureVerified middleware', err, { userId: req.user.id });
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

export const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Fallback to cookie
  if (!token && req.cookies) {
    token = req.cookies.token;
  }

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGO] }, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
};

  });
};

export const requireAdminKey = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  const expected = config.ADMIN_API_KEY;

  if (!expected) {
    ActivityLogger.error('[Admin] ADMIN_API_KEY not configured in environment.');
    return res.status(503).json({ error: 'Admin endpoint not configured.' });
  }

  if (!key) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Timing-safe comparison for administrative key
  const bufKey = Buffer.from(key);
  const bufExpected = Buffer.from(expected);

  if (bufKey.length !== bufExpected.length || !crypto.timingSafeEqual(bufKey, bufExpected)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};
