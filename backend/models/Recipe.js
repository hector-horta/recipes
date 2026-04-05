import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Recipe = sequelize.define('Recipe', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title_es: {
    type: DataTypes.STRING,
    allowNull: false
  },
  title_en: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    unique: true
  },
  prep_time_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  cook_time_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  servings: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    defaultValue: 'medium'
  },
  ingredients: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  steps: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  tags: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  image_filename: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sibo_risk_level: {
    type: DataTypes.ENUM('safe', 'caution', 'avoid'),
    defaultValue: 'safe'
  },
  sibo_alerts: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  source_type: {
    type: DataTypes.ENUM('manual', 'ocr_image', 'audio', 'telegram'),
    defaultValue: 'manual'
  },
  source_reference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'draft'
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'recipes',
  underscored: true,
  timestamps: true
});
