import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Ingredient = sequelize.define('Ingredient', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name_es: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name_en: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  calories: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  protein: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  carbs: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  fat: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  }
}, {
  tableName: 'ingredients',
  underscored: true,
  timestamps: true
});
