import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { 
  registerSchema, 
  loginSchema, 
  profileUpdateSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../models/validators.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthService } from '../services/AuthService.js';
import { setAuthCookie } from '../utils/authHelpers.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: { error: 'Demasiados intentos de inicio de sesión, intenta nuevamente en 15 minutos.' }
});

const resendVerifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute cooldown
  max: 1,
  message: { error: 'Por favor espera un minuto antes de solicitar otro correo de verificación.' },
  skipFailedRequests: true
});

// POST /api/auth/register
router.post('/register', asyncHandler(async (req, res) => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    const error = new Error('Datos inválidos');
    error.status = 400;
    error.name = 'ZodError';
    error.errors = parseResult.error.errors;
    throw error;
  }
  
  const result = await AuthService.registerUser(parseResult.data);
  setAuthCookie(res, result.token);
  res.status(201).json(result);
}));

// POST /api/auth/login
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    const error = new Error('Datos inválidos');
    error.status = 400;
    error.name = 'ZodError';
    error.errors = parseResult.error.errors;
    throw error;
  }
  
  const result = await AuthService.loginUser(parseResult.data);
  setAuthCookie(res, result.token);
  res.json(result);
}));

// POST /api/auth/resend-verification
router.post('/resend-verification', authenticateToken, resendVerifyLimiter, asyncHandler(async (req, res) => {
  const result = await AuthService.resendVerification(req.user.id);
  res.json(result);
}));

// POST /api/auth/verify
router.post('/verify', asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    const error = new Error('Token de verificación requerido.');
    error.status = 400;
    throw error;
  }

  const result = await AuthService.verifyEmail(token);
  res.json(result);
}));

// POST /api/auth/forgot-password
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const parseResult = forgotPasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    const error = new Error('Email inválido');
    error.status = 400;
    throw error;
  }

  const result = await AuthService.forgotPassword(parseResult.data.email);
  res.json(result);
}));

// POST /api/auth/reset-password
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token) {
    const error = new Error('Token requerido.');
    error.status = 400;
    throw error;
  }

  const parseResult = resetPasswordSchema.safeParse({ password });
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map(e => e.message).join('. ');
    const error = new Error(errorMessage || 'Password inválido');
    error.status = 400;
    error.name = 'ZodError';
    error.errors = parseResult.error.errors;
    throw error;
  }

  const result = await AuthService.resetPassword(token, password);
  res.json(result);
}));

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Sesión cerrada exitosamente.' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const result = await AuthService.getMe(req.user.id);
  res.json(result);
}));

// PUT /api/auth/profile
router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    const error = new Error('El cuerpo de la solicitud debe ser un objeto JSON válido.');
    error.status = 400;
    throw error;
  }

  const parseResult = profileUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    const error = parseResult.error;
    error.status = 400;
    error.message = 'Datos de perfil inválidos';
    throw error;
  }
  
  const result = await AuthService.updateProfile(req.user.id, parseResult.data);
  res.json(result);
}));

// DELETE /api/auth/me (GDPR Right to be forgotten)
router.delete('/me', authenticateToken, asyncHandler(async (req, res) => {
  const result = await AuthService.deleteAccount(req.user.id);
  res.json(result);
}));

export default router;
