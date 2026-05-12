import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const UserOrganization = sequelize.define('UserOrganization', {
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'organizations',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'user'
  }
}, {
  tableName: 'user_organizations',
  timestamps: true,
  underscored: true
});
