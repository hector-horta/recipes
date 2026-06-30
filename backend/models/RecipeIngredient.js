import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const RecipeIngredient = sequelize.define('RecipeIngredient', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  recipe_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'recipes',
      key: 'id'
    }
  },
  ingredient_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'ingredients',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  quantity_numeric: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  unit_es: {
    type: DataTypes.STRING,
    allowNull: true
  },
  unit_en: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sibo_alert: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'recipe_ingredients',
  underscored: true,
  timestamps: true
});
