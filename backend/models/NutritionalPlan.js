import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './User.js';
import { Organization } from './Organization.js';

export const NutritionalPlan = sequelize.define('NutritionalPlan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'organizations',
      key: 'id'
    }
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  meals: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'nutritional_plans',
  timestamps: true,
  underscored: true
});

// Associations
NutritionalPlan.belongsTo(User, { as: 'patient', foreignKey: 'patient_id' });
NutritionalPlan.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });
NutritionalPlan.belongsTo(Organization, { foreignKey: 'organization_id' });

User.hasMany(NutritionalPlan, { as: 'patientPlans', foreignKey: 'patient_id' });
User.hasMany(NutritionalPlan, { as: 'createdPlans', foreignKey: 'created_by' });
Organization.hasMany(NutritionalPlan, { foreignKey: 'organization_id' });
