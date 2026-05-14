import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import crypto from 'crypto';
import { Organization } from '../models/Organization.js';

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

import { ActivityLogger } from '../services/ActivityLogger.js';

export const requireAdminKey = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  const expected = config.ADMIN_API_KEY;

  if (!expected) {
    ActivityLogger.error('[Admin] ADMIN_API_KEY not configured in environment.');
    return res.status(503).json({ error: 'Admin endpoint not configured.' });
  }

  // Allow bypass if already authenticated as super_admin via JWT
  if (req.user && req.user.role === 'super_admin') {
    return next();
  }

  if (!key) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Timing-safe comparison for administrative key
  try {
    const bufKey = Buffer.from(key);
    const bufExpected = Buffer.from(expected);

    if (bufKey.length === bufExpected.length && crypto.timingSafeEqual(bufKey, bufExpected)) {
      return next();
    }
  } catch (e) {
    // Handle buffer errors
  }

  return res.status(401).json({ error: 'Unauthorized' });
};

/**
 * checkRole Middleware
 * Validates that the user has one of the allowed roles OR provides a valid admin key.
 * @param {string[]} allowedRoles 
 */
export const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    // 1. If an admin key is present and valid, allow access (Legacy/Integration Support)
    const adminKey = req.headers['x-admin-key'];
    if (adminKey && config.ADMIN_API_KEY) {
      try {
        const bufKey = Buffer.from(adminKey);
        const bufExpected = Buffer.from(config.ADMIN_API_KEY);
        if (bufKey.length === bufExpected.length && crypto.timingSafeEqual(bufKey, bufExpected)) {
          return next();
        }
      } catch (e) {}
    }

    // 2. Validate JWT Role
    if (!req.user) {
      return res.status(401).json({ error: 'Acceso denegado. Se requiere autenticación.' });
    }

    // 3. Check Organization Status (if not super_admin)
    if (req.user.role !== 'super_admin' && req.user.organization_id) {
      const org = await Organization.findByPk(req.user.organization_id);
      if (org && !org.is_active) {
        return res.status(403).json({ 
          error: 'Acceso denegado. Tu organización está suspendida.',
          code: 'ORGANIZATION_SUSPENDED'
        });
      }
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    // super_admin always has access
    if (req.user.role === 'super_admin') {
      return next();
    }

    return res.status(403).json({ error: 'No tienes permisos suficientes para realizar esta acción.' });
  };
};
