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

const router = express.Router();
const JWT_SECRET = config.JWT_SECRET;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: { error: 'Demasiados intentos de inicio de sesión, intenta nuevamente en 15 minutos.' }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.errors });
    }
    
    const { email, password, displayName, language } = parseResult.data;

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
        conditions: []
      }
    });
  } catch (error) {
    ActivityLogger.error('Registration failed', error, { email: req.body?.email });
    res.status(500).json({ error: 'Error interno del servidor durante el registro.' });
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
  } catch (error) {
    ActivityLogger.error('Login failed', error, { email: req.body?.email });
    res.status(500).json({ error: 'Error interno del servidor durante el inicio de sesión.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Sesión cerrada exitosamente.' });
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
      ...(user.profile ? user.profile.get({ plain: true }) : {}),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    ActivityLogger.error('Fetching self (me) profile failed', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Error al obtener su perfil.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const parseResult = profileUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos de perfil inválidos', details: parseResult.error.errors });
    }
    
    const updates = parseResult.data;

    const profile = await Profile.findOne({ where: { user_id: req.user.id } });
    if (!profile) {
      return res.status(404).json({ error: 'Perfil no encontrado.' });
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
  } catch (error) {
    ActivityLogger.error('Profile update failed', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Error al actualizar sus preferencias.' });
  }
});

// DELETE /api/auth/me (GDPR Right to be forgotten)
router.delete('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    await user.destroy();
    res.json({ message: 'Sus datos han sido eliminados de manera permanente exitosamente.' });
  } catch (error) {
    ActivityLogger.error('GDPR user deletion failed', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Error al intentar procesar su solicitud de borrado.' });
  }
});

export default router;
