import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateToken, optionalAuthenticateToken } from './auth.js';
import jwt from 'jsonwebtoken';

vi.mock('jsonwebtoken');

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
      jwt.verify.mockImplementation((token, secret, cb) => cb(new Error('Invalid'), null));
      
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should call next and set req.user if token is valid', () => {
      const user = { id: '123' };
      req.headers['authorization'] = 'Bearer valid-token';
      jwt.verify.mockImplementation((token, secret, cb) => cb(null, user));
      
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
      jwt.verify.mockImplementation((token, secret, cb) => cb(null, user));
      
      optionalAuthenticateToken(req, res, next);
      expect(req.user).toEqual(user);
      expect(next).toHaveBeenCalled();
    });
  });
});
