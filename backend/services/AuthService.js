import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { UserOrganization } from '../models/UserOrganization.js';
import { Profile } from '../models/Profile.js';
import { config } from '../config/env.js';
import { ActivityLogger } from './ActivityLogger.js';
import { IEmailService } from './IEmailService.js';
import {
  generateSessionToken,
  generateVerifyToken,
  generateResetToken,
  verifyVerifyToken,
  verifyResetToken
} from '../utils/authHelpers.js';

export class AuthService {
  static async registerUser({ email, password, displayName, language }) {
    const emailLower = email.toLowerCase();
    const existingUser = await User.findOne({ where: { email: emailLower } });
    if (existingUser) {
      const error = new Error('Ya existe una cuenta con este correo electrónico.');
      error.status = 409;
      throw error;
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await User.create({
      email: emailLower,
      password_hash: passwordHash,
      display_name: displayName,
      accepted_terms_at: new Date(),
      is_verified: false
    });

    await Profile.create({ user_id: newUser.id, language: language || 'en' });

    const verifyToken = generateVerifyToken(newUser.id);
    const verifyLink = `${config.FRONTEND_URL}/verify?token=${verifyToken}`;

    IEmailService.sendVerificationEmail(newUser.email, newUser.display_name, verifyLink)
      .catch(err => ActivityLogger.error('Registration verification email failed', err));

    const token = generateSessionToken(newUser, null);

    return {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name,
        is_verified: false,
        onboarding_completed: false,
        language: language || 'en',
        diet: null,
        intolerances: [],
        severities: {},
      }
    };
  }

  static async loginUser({ email, password }) {
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user || !user.is_active) {
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

    const userOrg = await UserOrganization.findOne({ where: { user_id: user.id } });
    const organization_id = userOrg ? userOrg.organization_id : null;

    const token = generateSessionToken(user, organization_id);

    const userWithProfile = await User.findByPk(user.id, {
      include: [{ model: Profile, as: 'profile' }]
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        organization_id,
        is_verified: user.is_verified,
        ...(userWithProfile.profile ? userWithProfile.profile.get({ plain: true }) : {})
      }
    };
  }

  static async resendVerification(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error('Usuario no encontrado.');
      error.status = 404;
      throw error;
    }

    if (user.is_verified) {
      return { message: 'Tu cuenta ya está verificada.', alreadyVerified: true };
    }

    const verifyToken = generateVerifyToken(user.id);
    const verifyLink = `${config.FRONTEND_URL}/verify?token=${verifyToken}`;

    await IEmailService.sendVerificationEmail(user.email, user.display_name, verifyLink);

    return { message: 'Enlace de verificación enviado exitosamente.' };
  }

  static async verifyEmail(token) {
    try {
      const decoded = verifyVerifyToken(token);
      if (decoded.type !== 'VERIFY') {
        const error = new Error('Token inválido.');
        error.status = 400;
        throw error;
      }

      const user = await User.findByPk(decoded.id);
      if (!user) {
        const error = new Error('Usuario no encontrado.');
        error.status = 404;
        throw error;
      }

      if (user.is_verified) {
        return { message: 'Cuenta ya verificada.' };
      }

      user.is_verified = true;
      await user.save();

      return { message: '¡Cuenta verificada exitosamente!' };
    } catch (err) {
      if (err.status) throw err;
      const error = new Error('El enlace es inválido o ha expirado.');
      error.status = 400;
      throw error;
    }
  }

  static async forgotPassword(email) {
    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    // Por seguridad, siempre respondemos éxito incluso si el usuario no existe
    if (!user || !user.is_active) {
      return { message: 'Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.' };
    }

    const resetToken = generateResetToken(user.id);
    const resetLink = `${config.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await IEmailService.sendPasswordResetEmail(user.email, user.display_name, resetLink);

    return { message: 'Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.' };
  }

  static async resetPassword(token, password) {
    try {
      const decoded = verifyResetToken(token);
      if (decoded.type !== 'RESET') {
        const error = new Error('Token inválido.');
        error.status = 400;
        throw error;
      }

      const user = await User.findByPk(decoded.id);
      if (!user || !user.is_active) {
        const error = new Error('Usuario no encontrado.');
        error.status = 404;
        throw error;
      }

      const saltRounds = 12;
      user.password_hash = await bcrypt.hash(password, saltRounds);
      await user.save();

      return { message: 'Contraseña actualizada exitosamente. Ahora puedes iniciar sesión.' };
    } catch (err) {
      if (err.status) throw err;
      const error = new Error('El enlace es inválido o ha expirado.');
      error.status = 400;
      throw error;
    }
  }

  static async getMe(userId) {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'display_name', 'role', 'is_active', 'is_verified', 'createdAt', 'updatedAt'],
      include: [{ model: Profile, as: 'profile' }]
    });

    if (!user || !user.is_active) {
      const error = new Error('Usuario no encontrado.');
      error.status = 404;
      throw error;
    }

    const userOrg = await UserOrganization.findOne({ where: { user_id: user.id } });
    const organization_id = userOrg ? userOrg.organization_id : null;

    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      organization_id,
      is_verified: user.is_verified,
      ...(user.profile ? user.profile.get({ plain: true }) : {}),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  static async updateProfile(userId, updates) {
    const profile = await Profile.findOne({ where: { user_id: userId } });
    if (!profile) {
      const error = new Error('Perfil no encontrado.');
      error.status = 404;
      throw error;
    }

    if (updates.diet !== undefined) profile.diet = updates.diet;
    if (updates.intolerances !== undefined) profile.intolerances = updates.intolerances;

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
    return profile;
  }

  static async deleteAccount(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error('Usuario no encontrado.');
      error.status = 404;
      throw error;
    }

    await user.destroy();
    return { message: 'Sus datos han sido eliminados de manera permanente exitosamente.' };
  }
}
