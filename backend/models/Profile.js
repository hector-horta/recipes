import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './User.js';

export const Profile = sequelize.define('Profile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  diet: {
    type: DataTypes.ENUM('None', 'Vegan', 'Vegetarian', 'Keto', 'Paleo', 'SIBO'),
    allowNull: false,
    defaultValue: 'None'
  },
  intolerances: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  excluded_ingredients: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },
  daily_calories: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 2000
  },
  onboarding_completed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  language: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: 'en'
  },
  severities: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  }
}, {
  tableName: 'profiles',
  timestamps: true,
  underscored: true
});

// Associations
User.hasOne(Profile, { foreignKey: 'user_id', as: 'profile' });
Profile.belongsTo(User, { foreignKey: 'user_id' });
