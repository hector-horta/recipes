import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { authenticateToken } from '../middleware/auth.js';
import { config } from '../config/env.js';
import { ActivityLogger } from '../services/ActivityLogger.js';
import { registerSchema, loginSchema, profileUpdateSchema } from '../models/validators.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();
const JWT_SECRET = config.JWT_SECRET;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: { error: 'Demasiados intentos de inicio de sesión, intenta nuevamente en 15 minutos.' }
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
  
  const { email, password, displayName, language } = parseResult.data;

  const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existingUser) {
    const error = new Error('Ya existe una cuenta con este correo electrónico.');
    error.status = 409;
    throw error;
  }

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const newUser = await User.create({
    email: email.toLowerCase(),
    password_hash: passwordHash,
    display_name: displayName,
    accepted_terms_at: new Date()
  });

  await Profile.create({ user_id: newUser.id, language: language || 'en' });

  const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { 
    expiresIn: '7d',
    algorithm: 'HS256' 
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 
  });

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      displayName: newUser.display_name,
      onboarding_completed: false,
      language: language || 'en',
      diet: null,
      intolerances: [],
      severities: {},
    }
  });
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
  
  const { email, password } = parseResult.data;

  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user || (!user.is_active)) {
    const error = new Error('Credenciales inválidas o cuenta desactivada.');
    error.status = 401;
    throw error;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    const error = new Error('Credenciales inválidas.');
    error.status = 401;
    throw error;
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { 
    expiresIn: '7d',
    algorithm: 'HS256'
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 
  });

  const userWithProfile = await User.findByPk(user.id, {
    include: [{ model: Profile, as: 'profile' }]
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      ...(userWithProfile.profile ? userWithProfile.profile.get({ plain: true }) : {})
    }
  });
}));

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Sesión cerrada exitosamente.' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: ['id', 'email', 'display_name', 'is_active', 'createdAt', 'updatedAt'],
    include: [{ model: Profile, as: 'profile' }]
  });

  if (!user || (!user.is_active)) {
    const error = new Error('Usuario no encontrado.');
    error.status = 404;
    throw error;
  }

  res.json({
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    ...(user.profile ? user.profile.get({ plain: true }) : {}),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  });
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
    // Inject custom message into the ZodError before throwing
    const error = parseResult.error;
    error.status = 400;
    error.message = 'Datos de perfil inválidos';
    throw error;
  }
  
  const updates = parseResult.data;

  const profile = await Profile.findOne({ where: { user_id: req.user.id } });
  if (!profile) {
    const error = new Error('Perfil no encontrado.');
    error.status = 404;
    throw error;
  }

  if (updates.diet !== undefined) profile.diet = updates.diet;
  if (updates.intolerances !== undefined) profile.intolerances = updates.intolerances;
  
  // Convert array to string for excluded_ingredients if necessary
  if (updates.excluded_ingredients !== undefined) {
     profile.excluded_ingredients = Array.isArray(updates.excluded_ingredients) 
      ? updates.excluded_ingredients.join(', ') 
      : updates.excluded_ingredients;
  }

  if (updates.daily_calories !== undefined) profile.daily_calories = updates.daily_calories;
  if (updates.onboarding_completed !== undefined) profile.onboarding_completed = updates.onboarding_completed;
  if (updates.language !== undefined) profile.language = updates.language;
  if (updates.severities !== undefined) profile.severities = updates.severities;
  if (updates.conditions !== undefined) profile.conditions = updates.conditions;

  await profile.save();
  res.json(profile);
}));

// DELETE /api/auth/me (GDPR Right to be forgotten)
router.delete('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    const error = new Error('Usuario no encontrado.');
    error.status = 404;
    throw error;
  }

  await user.destroy();
  res.json({ message: 'Sus datos han sido eliminados de manera permanente exitosamente.' });
}));

export default router;
