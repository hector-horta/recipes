import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { authenticateToken } from '../middleware/auth.js';

import { config } from '../config/env.js';

const router = express.Router();
const JWT_SECRET = config.JWT_SECRET;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: { error: 'Demasiados intentos de inicio de sesión, intenta nuevamente en 15 minutos.' }
});

const registerSchema = z.object({
  email: z.string().email('Debe ser un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  displayName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  acceptedTerms: z.boolean().refine(val => val === true, { message: 'Debe aceptar los términos' }),
  language: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Debe ser un email válido'),
  password: z.string()
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.errors });
    }
    
    const { email, password, displayName, acceptedTerms, language } = parseResult.data;

    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(409).json({ error: 'Ya existe una cuenta con este correo electrónico.' });
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

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name
      }
    });
  } catch (error) {
    console.error('[Auth] Error de DB o servidor durante el registro:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.errors });
    }
    
    const { email, password } = parseResult.data;

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user || (!user.is_active)) {
      return res.status(401).json({ error: 'Credenciales inválidas o cuenta desactivada.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name
      }
    });
  } catch (error) {
    console.error('[Auth] Error de DB o servidor durante el login:', error.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'display_name', 'is_active', 'createdAt', 'updatedAt'],
      include: [{ model: Profile, as: 'profile' }]
    });

    if (!user || (!user.is_active)) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      profile: user.profile,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('[DEBUG-AUTH-ERROR] Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;

    const profile = await Profile.findOne({ where: { user_id: req.user.id } });
    if (!profile) {
      return res.status(404).json({ error: 'Perfil no encontrado.' });
    }

    if (updates.diet !== undefined) profile.diet = updates.diet;
    if (updates.intolerances !== undefined) profile.intolerances = updates.intolerances;
    if (updates.excluded_ingredients !== undefined) profile.excluded_ingredients = updates.excluded_ingredients;
    if (updates.daily_calories !== undefined) profile.daily_calories = updates.daily_calories;
    if (updates.onboarding_completed !== undefined) profile.onboarding_completed = updates.onboarding_completed;
    if (updates.language !== undefined) profile.language = updates.language;
    if (updates.severities !== undefined) profile.severities = updates.severities;

    await profile.save();
    res.json(profile);
  } catch (error) {
    console.error('[Auth] Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// DELETE /api/auth/me (GDPR Right to be forgotten)
router.delete('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // ON DELETE CASCADE automatically sweeps Profile and FavoriteRecipes
    await user.destroy();
    res.json({ message: 'Sus datos han sido eliminados de manera permanente exitosamente.' });
  } catch (error) {
    console.error('[Auth] Fallo durante la eliminación (GDPR) de cuenta.');
    res.status(500).json({ error: 'Error al intentar procesar su solicitud de borrado.' });
  }
});

export default router;
