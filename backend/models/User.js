import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Organization } from './Organization.js';
import { UserOrganization } from './UserOrganization.js';

export const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  display_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  accepted_terms_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  data_exported_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('user', 'admin', 'super_admin'),
    defaultValue: 'user',
    allowNull: false
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'organizations',
      key: 'id'
    }
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

// Many-to-Many association via UserOrganization
User.belongsToMany(Organization, { 
  through: UserOrganization, 
  foreignKey: 'user_id', 
  otherKey: 'organization_id',
  as: 'organizations' 
});

Organization.belongsToMany(User, { 
  through: UserOrganization, 
  foreignKey: 'organization_id', 
  otherKey: 'user_id',
  as: 'users' 
});
