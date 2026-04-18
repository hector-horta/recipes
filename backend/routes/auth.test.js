import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

vi.mock('../models/User.js', () => ({
  User: {
    findOne: vi.fn(),
    create: vi.fn(),
    findByPk: vi.fn(),
    hasOne: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
  }
}));

vi.mock('../models/Profile.js', () => ({
  Profile: {
    findOne: vi.fn(),
    create: vi.fn(),
    hasOne: vi.fn(),
    belongsTo: vi.fn(),
  }
}));

vi.mock('../services/IEmailService.js', () => ({
  IEmailService: {
    sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
    sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
  }
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  }
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  }
}));

vi.mock('express-rate-limit', () => ({
  default: () => (req, res, next) => next()
}));

vi.mock('../middleware/auth.js', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'test-uuid', email: 'test@test.com' };
    next();
  }
}));

import authRoutes from './auth.js';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { IEmailService } from '../services/IEmailService.js';
import { errorHandler } from '../middleware/errorHandler.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and send verification email', async () => {
      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed-password');
      User.create.mockResolvedValue({ 
        id: 'new-uuid', 
        email: 'test@test.com', 
        display_name: 'Test',
        is_verified: false 
      });
      Profile.create.mockResolvedValue({});
      jwt.sign.mockReturnValue('test-token');

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: 'Password123', displayName: 'Test', acceptedTerms: true });

      expect(res.status).toBe(201);
      expect(res.body.token).toBe('test-token');
      expect(User.create).toHaveBeenCalled();
      expect(IEmailService.sendVerificationEmail).toHaveBeenCalledWith('test@test.com', 'Test', expect.any(String));
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should verify email with valid token', async () => {
      jwt.verify.mockReturnValue({ id: 'user-uuid', type: 'VERIFY' });
      const mockUpdate = vi.fn().mockResolvedValue({});
      User.findByPk.mockResolvedValue({ id: 'user-uuid', is_verified: false, update: mockUpdate, save: mockUpdate });

      const res = await request(app)
        .post('/api/auth/verify')
        .send({ token: 'valid-token' });

      expect(res.status).toBe(200);
    });

    it('should return 400 for invalid token', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });

      const res = await request(app)
        .post('/api/auth/verify')
        .send({ token: 'invalid-token' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should resend verification email for unverified user', async () => {
      User.findByPk.mockResolvedValue({ 
        id: 'test-uuid', 
        email: 'test@test.com', 
        display_name: 'Test',
        is_verified: false 
      });
      jwt.sign.mockReturnValue('new-token');

      const res = await request(app).post('/api/auth/resend-verification');

      expect(res.status).toBe(200);
      expect(IEmailService.sendVerificationEmail).toHaveBeenCalledWith('test@test.com', 'Test', expect.any(String));
    });

    it('should return 200 message if user is already verified', async () => {
      User.findByPk.mockResolvedValue({ 
        id: 'test-uuid', 
        is_verified: true 
      });

      const res = await request(app).post('/api/auth/resend-verification');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('ya está verificada');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send reset email if user exists', async () => {
      User.findOne.mockResolvedValue({ 
        id: 'user-uuid',
        email: 'test@test.com', 
        display_name: 'Test',
        is_active: true 
      });
      jwt.sign.mockReturnValue('reset-token');

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(200);
      expect(IEmailService.sendPasswordResetEmail).toHaveBeenCalledWith('test@test.com', 'Test', expect.any(String));
    });

    it('should return 200 even if user doesn\'t exist (security)', async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      expect(res.status).toBe(200);
      expect(IEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      jwt.verify.mockReturnValue({ id: 'user-uuid', type: 'RESET' });
      const mockUpdate = vi.fn().mockResolvedValue({});
      User.findByPk.mockResolvedValue({ id: 'user-uuid', is_active: true, update: mockUpdate, save: mockUpdate });
      bcrypt.hash.mockResolvedValue('new-hashed-password');

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid-token', password: 'NewPassword123' });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      User.findOne.mockResolvedValue({ 
        id: 'user-uuid', 
        email: 'test@test.com', 
        password_hash: 'hashed',
        is_active: true,
        display_name: 'Test',
        is_verified: true
      });
      User.findByPk.mockResolvedValue({
        id: 'user-uuid',
        email: 'test@test.com',
        display_name: 'Test',
        is_verified: true,
        profile: { get: () => ({ language: 'en', diet: null, intolerances: [], severities: {} }) }
      });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('test-token');

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBe('test-token');
      expect(res.body.user.is_verified).toBe(true);
    });
  });

  describe('DELETE /api/auth/me', () => {
    it('should delete user and return success message', async () => {
      const mockDestroy = vi.fn().mockResolvedValue({});
      User.findByPk.mockResolvedValue({ destroy: mockDestroy });

      const res = await request(app).delete('/api/auth/me');

      expect(res.status).toBe(200);
      expect(mockDestroy).toHaveBeenCalled();
    });
  });
});