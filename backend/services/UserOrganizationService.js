import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sequelize } from '../config/database.js';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { UserOrganization } from '../models/UserOrganization.js';
import { Profile } from '../models/Profile.js';
import { ActivityLogger } from './ActivityLogger.js';
import { RecipeProvider } from './RecipeProvider.js';

export class UserOrganizationService {
  /**
   * Agrega un usuario individual a la organización. Si no existe, lo crea.
   */
  static async addUserToOrganization(id, { displayName, email, role }) {
    const org = await Organization.findByPk(id);
    if (!org) {
      const error = new Error('Organización no encontrada.');
      error.status = 404;
      throw error;
    }

    let user = await User.findOne({ where: { email: email.toLowerCase() } });
    let createdNewUser = false;

    if (user) {
      const exists = await UserOrganization.findOne({
        where: {
          user_id: user.id,
          organization_id: org.id
        }
      });
      if (exists) {
        const error = new Error('El usuario ya pertenece a esta organización.');
        error.status = 409;
        throw error;
      }
    } else {
      const saltRounds = 12;
      const tempPassword = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

      user = await User.create({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        display_name: displayName,
        accepted_terms_at: new Date(),
        is_verified: false
      });
      createdNewUser = true;

      await Profile.create({ user_id: user.id, language: 'es' });
    }

    const userOrg = await UserOrganization.create({
      user_id: user.id,
      organization_id: org.id,
      role: role || 'user'
    });

    ActivityLogger.log('ADMIN_ORG_USER_ADD', { 
      organizationId: org.id, 
      userId: user.id, 
      role: userOrg.role,
      createdNewUser 
    });

    await RecipeProvider.clearCache();

    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      isActive: user.is_active,
      role: userOrg.role,
      joinedAt: userOrg.created_at,
      createdNewUser
    };
  }

  /**
   * Carga masiva de usuarios y asociación a la organización con transacción atómica.
   */
  static async bulkAddUsersToOrganization(id, users) {
    const org = await Organization.findByPk(id);
    if (!org) {
      const error = new Error('Organización no encontrada.');
      error.status = 404;
      throw error;
    }

    const results = {
      total: users.length,
      created: 0,
      associated: 0,
      errors: []
    };

    await sequelize.transaction(async (t) => {
      for (let i = 0; i < users.length; i++) {
        const uData = users[i];
        const emailLower = uData.email.toLowerCase();
        try {
          let user = await User.findOne({ where: { email: emailLower } }, { transaction: t });
          let createdNewUser = false;

          if (user) {
            const exists = await UserOrganization.findOne({
              where: {
                user_id: user.id,
                organization_id: org.id
              }
            }, { transaction: t });

            if (exists) {
              results.errors.push({
                row: i + 1,
                email: uData.email,
                reason: 'El usuario ya pertenece a esta organización.'
              });
              continue;
            }
          } else {
            const saltRounds = 12;
            const tempPassword = crypto.randomUUID();
            const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

            user = await User.create({
              email: emailLower,
              password_hash: passwordHash,
              display_name: uData.displayName,
              accepted_terms_at: new Date(),
              is_verified: false
            }, { transaction: t });

            await Profile.create({ user_id: user.id, language: 'es' }, { transaction: t });
            createdNewUser = true;
          }

          await UserOrganization.create({
            user_id: user.id,
            organization_id: org.id,
            role: uData.role || 'user'
          }, { transaction: t });

          if (createdNewUser) {
            results.created++;
          } else {
            results.associated++;
          }
        } catch (err) {
          results.errors.push({
            row: i + 1,
            email: uData.email,
            reason: err.message || 'Error inesperado al procesar el usuario.'
          });
        }
      }
    });

    ActivityLogger.log('ADMIN_ORG_USER_BULK', { 
      organizationId: org.id, 
      total: results.total,
      created: results.created,
      associated: results.associated,
      errorsCount: results.errors.length
    });

    await RecipeProvider.clearCache();

    return results;
  }

  /**
   * Desasocia un usuario de la organización (sin eliminar su cuenta).
   */
  static async removeUserFromOrganization(id, userId) {
    const org = await Organization.findByPk(id);
    if (!org) {
      const error = new Error('Organización no encontrada.');
      error.status = 404;
      throw error;
    }

    const relation = await UserOrganization.findOne({
      where: {
        user_id: userId,
        organization_id: org.id
      }
    });

    if (!relation) {
      const error = new Error('El usuario no pertenece a esta organización.');
      error.status = 404;
      throw error;
    }

    await relation.destroy();

    ActivityLogger.log('ADMIN_ORG_USER_REMOVE', { 
      organizationId: org.id, 
      userId 
    });

    await RecipeProvider.clearCache();

    return { message: 'Usuario removido de la organización correctamente' };
  }
}
