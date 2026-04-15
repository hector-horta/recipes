import { describe, it, expect, vi } from 'vitest';
import { MagicLinkService } from '../services/MagicLinkService.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

describe('MagicLinkService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  };

  it('should generate a valid JWT token with user id and email', () => {
    const token = MagicLinkService.generateToken(mockUser);
    expect(token).toBeDefined();
    
    const decoded = jwt.decode(token);
    expect(decoded.id).toBe(mockUser.id);
    expect(decoded.email).toBe(mockUser.email);
    // Expiry should be 15m (900 seconds)
    const now = Math.floor(Date.now() / 1000);
    expect(decoded.exp).toBeGreaterThan(now);
    expect(decoded.exp).toBeLessThanOrEqual(now + 901);
  });

  it('should verify a valid token', () => {
    const token = MagicLinkService.generateToken(mockUser);
    const payload = MagicLinkService.verifyToken(token);
    
    expect(payload).not.toBeNull();
    expect(payload.id).toBe(mockUser.id);
    expect(payload.email).toBe(mockUser.email);
  });

  it('should return null for an invalid token', () => {
    const payload = MagicLinkService.verifyToken('invalid-token');
    expect(payload).toBeNull();
  });

  it('should return null for an expired token', () => {
    // Generate an expired token
    const token = jwt.sign(
      { id: mockUser.id, email: mockUser.email },
      config.MAGIC_LINK_SECRET,
      { expiresIn: '-1s' }
    );
    
    const payload = MagicLinkService.verifyToken(token);
    expect(payload).toBeNull();
  });

  it('should construct a full verification link', () => {
    const token = 'test-token';
    const link = MagicLinkService.generateLink(token);
    expect(link).toBe(`${config.FRONTEND_URL}/verify-email?token=${token}`);
  });
});
