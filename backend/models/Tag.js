import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Tag = sequelize.define('Tag', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  es: {
    type: DataTypes.STRING,
    allowNull: false
  },
  en: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'tags',
  underscored: true,
  timestamps: true
});
