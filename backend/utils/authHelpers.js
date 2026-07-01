import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const JWT_SECRET = config.JWT_SECRET;
const JWT_VERIFY_SECRET = config.JWT_VERIFY_SECRET || JWT_SECRET;
const JWT_RESET_SECRET = config.JWT_RESET_SECRET || JWT_SECRET;

/**
 * Sets the HttpOnly cookie for the session token.
 * @param {object} res Express response object
 * @param {string} token JWT session token
 */
export function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

/**
 * Generates a session JWT token.
 * @param {object} user User instance/data
 * @param {string|null} organizationId Organization ID
 * @returns {string} Signed JWT
 */
export function generateSessionToken(user, organizationId) {
  return jwt.sign({
    id: user.id,
    email: user.email,
    role: user.role,
    organization_id: organizationId
  }, JWT_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256'
  });
}

/**
 * Generates a verification JWT token.
 * @param {string} userId User ID
 * @returns {string} Signed JWT
 */
export function generateVerifyToken(userId) {
  return jwt.sign(
    { id: userId, type: 'VERIFY' },
    JWT_VERIFY_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Generates a password reset JWT token.
 * @param {string} userId User ID
 * @returns {string} Signed JWT
 */
export function generateResetToken(userId) {
  return jwt.sign(
    { id: userId, type: 'RESET' },
    JWT_RESET_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Verifies a verification token.
 * @param {string} token JWT
 * @returns {object} Decoded payload
 */
export function verifyVerifyToken(token) {
  return jwt.verify(token, JWT_VERIFY_SECRET);
}

/**
 * Verifies a reset token.
 * @param {string} token JWT
 * @returns {object} Decoded payload
 */
export function verifyResetToken(token) {
  return jwt.verify(token, JWT_RESET_SECRET);
}
