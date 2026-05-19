import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Organization } from './Organization.js';

/**
 * ActivityLog — Telemetría de producto
 *
 * Registra acciones del usuario y eventos del sistema de forma asíncrona.
 * Nunca bloquea las respuestas HTTP.
 */
export const ActivityLog = sequelize.define('ActivityLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  action: {
    type: DataTypes.ENUM(
      'SEARCH',
      'VIEW_RECIPE',
      'ADD_FAVORITE',
      'INGEST_SUCCESS',
      'INGEST_FAIL',
      'NUTRI_RECIPE_CREATE',
      'NUTRI_RECIPE_UPDATE',
      'NUTRI_RECIPE_DELETE',
      'NUTRI_PLAN_CREATE',
      'NUTRI_PLAN_UPDATE',
      'NUTRI_PLAN_DELETE',
      'ADMIN_RECIPE_CREATE',
      'ADMIN_RECIPE_UPDATE',
      'ADMIN_RECIPE_DELETE',
      'ADMIN_TAG_CREATE',
      'ADMIN_TAG_UPDATE',
      'ADMIN_TAG_DELETE',
      'ADMIN_ORG_CREATE',
      'ADMIN_ORG_UPDATE',
      'ADMIN_ORG_TOGGLE_STATUS',
      'ADMIN_ORG_USER_ADD',
      'ADMIN_ORG_USER_BULK',
      'ADMIN_ORG_USER_REMOVE',
      'ERROR'
    ),
    allowNull: false
  },
  // Datos adicionales: { query, recipeId, title, source_type, error, ... }
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  // true cuando se buscó algo y no hubo resultados
  failed_search: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // FK nullable — el usuario puede no estar autenticado
  user_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  // Organization ID — nullable for global/Wati data
  organization_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'organizations',
      key: 'id'
    }
  },
  // IP del cliente para análisis geográfico / rate limiting
  ip: {
    type: DataTypes.STRING(64),
    allowNull: true
  }
}, {
  tableName: 'activity_logs',
  underscored: true,
  timestamps: true,
  updatedAt: false         // los logs son inmutables; solo tiene created_at
});

ActivityLog.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Organization.hasMany(ActivityLog, { foreignKey: 'organization_id', as: 'activity_logs' });
