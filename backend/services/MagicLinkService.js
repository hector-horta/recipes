import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * MagicLinkService — Handles generation and validation of email verification tokens.
 */
export class MagicLinkService {
  /**
   * Generates a 15-minute JWT token for email verification.
   * @param {object} user - User object containing id and email
   * @returns {string}
   */
  static generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email.toLowerCase() }, 
      config.MAGIC_LINK_SECRET, 
      { expiresIn: '15m', algorithm: 'HS256' }
    );
  }

  /**
   * Verifies the magic link token.
   * @param {string} token 
   * @returns {object|null} Payload if valid, null otherwise.
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, config.MAGIC_LINK_SECRET, { algorithms: ['HS256'] });
    } catch (err) {
      return null;
    }
  }

  /**
   * Constructs the full verification URL.
   * @param {string} token 
   * @returns {string}
   */
  static generateLink(token) {
    return `${config.FRONTEND_URL}/verify-email?token=${token}`;
  }
}
