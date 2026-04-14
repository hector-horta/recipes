import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const JWT_SECRET = config.JWT_SECRET;

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

  jwt.verify(token, JWT_SECRET, (err, user) => {
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

  jwt.verify(token, JWT_SECRET, (err, user) => {
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

  if (!key || key !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};
