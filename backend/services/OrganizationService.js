import { Op, fn, col } from 'sequelize';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { ActivityLogger } from './ActivityLogger.js';
import { RecipeProvider } from './RecipeProvider.js';

export class OrganizationService {
  /**
   * Obtiene todas las organizaciones con el conteo de sus usuarios.
   */
  static async getAllOrganizations() {
    const organizations = await Organization.findAll({
      attributes: {
        include: [
          [
            fn('COUNT', col('users.id')),
            'userCount'
          ]
        ]
      },
      include: [{
        model: User,
        as: 'users',
        attributes: [],
        through: { attributes: [] }
      }],
      group: ['Organization.id'],
      order: [['name', 'ASC']]
    });

    return organizations.map(org => ({
      ...org.toJSON(),
      status: org.is_active ? 'active' : 'suspended',
      userCount: parseInt(org.getDataValue('userCount'), 10) || 0
    }));
  }

  /**
   * Crea una nueva organización si no existe otra con el mismo nombre o slug.
   */
  static async createOrganization(name, slug) {
    const existing = await Organization.findOne({
      where: {
        [Op.or]: [
          { name },
          { slug: slug.toLowerCase() }
        ]
      }
    });

    if (existing) {
      const error = new Error('Ya existe una organización con ese nombre o slug.');
      error.status = 409;
      throw error;
    }

    const organization = await Organization.create({ 
      name, 
      slug: slug.toLowerCase(),
      is_active: true,
      settings: {}
    });
    
    ActivityLogger.log('ADMIN_ORG_CREATE', { organizationId: organization.id, name: organization.name });
    return organization;
  }

  /**
   * Actualiza una organización existente.
   */
  static async updateOrganization(id, { name, slug, is_active }) {
    const organization = await Organization.findByPk(id);
    if (!organization) {
      const error = new Error('Organización no encontrada.');
      error.status = 404;
      throw error;
    }

    // Verificar duplicados (excluyendo la actual)
    const existing = await Organization.findOne({
      where: {
        [Op.and]: [
          { id: { [Op.ne]: id } },
          {
            [Op.or]: [
              { name },
              { slug: slug.toLowerCase() }
            ]
          }
        ]
      }
    });

    if (existing) {
      const error = new Error('Ya existe otra organización con ese nombre o slug.');
      error.status = 409;
      throw error;
    }

    const updateFields = {
      name,
      slug: slug.toLowerCase()
    };
    if (is_active !== undefined) {
      updateFields.is_active = is_active;
    }

    await organization.update(updateFields);

    ActivityLogger.log('ADMIN_ORG_UPDATE', { 
      organizationId: organization.id, 
      name: organization.name,
      is_active: organization.is_active
    });

    await RecipeProvider.clearCache();

    return {
      ...organization.toJSON(),
      status: organization.is_active ? 'active' : 'suspended'
    };
  }

  /**
   * Alterna el estado activo/inactivo (is_active) de una organización.
   */
  static async toggleOrganizationStatus(id) {
    const organization = await Organization.findByPk(id);
    if (!organization) {
      const error = new Error('Organización no encontrada.');
      error.status = 404;
      throw error;
    }

    await organization.update({
      is_active: !organization.is_active
    });

    ActivityLogger.log('ADMIN_ORG_TOGGLE_STATUS', { 
      organizationId: organization.id, 
      name: organization.name,
      is_active: organization.is_active 
    });

    await RecipeProvider.clearCache();

    return organization;
  }

  /**
   * Obtiene detalles de la organización y sus usuarios.
   */
  static async getOrganizationDetails(id) {
    const org = await Organization.findByPk(id, {
      include: [{
        model: User,
        as: 'users',
        attributes: ['id', 'email', 'display_name', 'is_active'],
        through: { attributes: ['role', 'created_at'] }
      }]
    });
    
    if (!org) {
      const error = new Error('Organización no encontrada.');
      error.status = 404;
      throw error;
    }

    return {
      ...org.toJSON(),
      status: org.is_active ? 'active' : 'suspended',
      userCount: org.users.length,
      users: org.users.map(u => ({
        id: u.id,
        email: u.email,
        displayName: u.display_name,
        isActive: u.is_active,
        role: u.UserOrganization.role,
        joinedAt: u.UserOrganization.created_at
      }))
    };
  }
}
