import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 1. Mock modules WITH factories that don't depend on external variables
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

// 2. Import routes and the mocked models themselves
import authRoutes from './auth.js';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

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
        .send({ email: 'test@test.com', password: 'password123', displayName: 'Test', acceptedTerms: true });

      expect(res.status).toBe(201);
      expect(res.body.token).toBe('test-token');
      expect(User.create).toHaveBeenCalled();
    });

    it('should return 400 if acceptedTerms is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: 'password123', displayName: 'Test' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      User.findOne.mockResolvedValue({ 
        id: 'user-uuid', 
        email: 'test@test.com', 
        password_hash: 'hashed',
        is_active: true 
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
  });
});
