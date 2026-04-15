import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

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
      'SUGGEST_TO_CHEF',
      'USER_REGISTERED',
      'LOGIN_SUCCESS',
      'LOGIN_UNVERIFIED',
      'EMAIL_VERIFIED',
      'EMAIL_RESENT',
      'REMOVE_FAVORITE',
      'SYSTEM',
      'SYSTEM_ERROR',
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
