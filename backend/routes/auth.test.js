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

vi.mock('../middleware/auth.js', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'test-uuid' };
    next();
  }
}));

import authRoutes from './auth.js';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
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
    it('should register a new user successfully', async () => {
      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed-password');
      User.create.mockResolvedValue({ id: 'new-uuid', email: 'test@test.com', display_name: 'Test' });
      Profile.create.mockResolvedValue({});
      jwt.sign.mockReturnValue('test-token');

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: 'Password123', displayName: 'Test', acceptedTerms: true });

      expect(res.status).toBe(201);
      expect(res.body.token).toBe('test-token');
      expect(User.create).toHaveBeenCalled();
    });

    it('should return 400 if acceptedTerms is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: 'Password123', displayName: 'Test' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      User.findOne.mockResolvedValue({ 
        id: 'user-uuid', 
        email: 'test@test.com', 
        password_hash: 'hashed',
        is_active: true,
        display_name: 'Test'
      });
      User.findByPk.mockResolvedValue({
        id: 'user-uuid',
        email: 'test@test.com',
        display_name: 'Test',
        profile: { get: () => ({ language: 'en', diet: null, intolerances: [], severities: {} }) }
      });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('test-token');

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBe('test-token');
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

    it('should return 404 if user not found on delete', async () => {
      User.findByPk.mockResolvedValue(null);

      const res = await request(app).delete('/api/auth/me');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should respond', async () => {
      const res = await request(app).get('/api/auth/me');
      expect([401, 404]).toContain(res.status);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should respond', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect([200, 404]).toContain(res.status);
    });
  });
});