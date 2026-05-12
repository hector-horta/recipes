import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateToken, optionalAuthenticateToken, checkRole } from './auth.js';
import jwt from 'jsonwebtoken';

vi.mock('jsonwebtoken');
vi.mock('../services/ActivityLogger.js', () => ({
  ActivityLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Provide a default config mock to avoid database connection issues
vi.mock('../config/env.js', () => ({
  config: {
    JWT_SECRET: 'test-secret',
    ADMIN_API_KEY: 'test-admin-key',
    POSTGRES_PASSWORD: 'dummy'
  }
}));

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should return 401 if no token is provided', () => {
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Acceso denegado. Token no proporcionado.' });
    });

    it('should return 403 if token is invalid', () => {
      req.headers['authorization'] = 'Bearer invalid-token';
      jwt.verify.mockImplementation((...args) => {
        const cb = args[args.length - 1];
        cb(new Error('Invalid'), null);
      });
      
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should call next and set req.user if token is valid', () => {
      const user = { id: '123' };
      req.headers['authorization'] = 'Bearer valid-token';
      jwt.verify.mockImplementation((...args) => {
        const cb = args[args.length - 1];
        cb(null, user);
      });
      
      authenticateToken(req, res, next);
      expect(req.user).toEqual(user);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('optionalAuthenticateToken', () => {
    it('should call next if no token is provided', () => {
      optionalAuthenticateToken(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should set req.user if token is valid', () => {
      const user = { id: '123' };
      req.headers['authorization'] = 'Bearer valid-token';
      jwt.verify.mockImplementation((...args) => {
        const cb = args[args.length - 1];
        cb(null, user);
      });
      
      optionalAuthenticateToken(req, res, next);
      expect(req.user).toEqual(user);
      expect(next).toHaveBeenCalled();
    });
  });
  describe('checkRole', () => {
    it('should allow access if user has one of the allowed roles', () => {
      req.user = { id: '123', role: 'admin' };
      const middleware = checkRole(['admin', 'editor']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow access if user is super_admin even if not in allowed roles', () => {
      req.user = { id: '123', role: 'super_admin' };
      const middleware = checkRole(['admin']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if user role is not allowed', () => {
      req.user = { id: '123', role: 'user' };
      const middleware = checkRole(['admin']);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should allow access via valid x-admin-key bypass', () => {
      req.headers['x-admin-key'] = 'test-admin-key';
      
      const middleware = checkRole(['user']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
