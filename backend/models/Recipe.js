import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Organization } from './Organization.js';
import { Ingredient } from './Ingredient.js';
import { RecipeIngredient } from './RecipeIngredient.js';

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
    type: DataTypes.VIRTUAL,
    get() {
      const list = this.recipeIngredients || [];
      return list.map(ri => {
        const join = ri.RecipeIngredient || {};
        return {
          name: {
            es: ri.name_es,
            en: ri.name_en
          },
          quantity: join.quantity || '',
          unit: {
            es: join.unit_es || '',
            en: join.unit_en || ''
          },
          siboAlert: join.sibo_alert || false
        };
      });
    },
    set(value) {
      this._ingredientsData = value;
    }
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
  tableName: 'recipes',
  underscored: true,
  timestamps: true,
  defaultScope: {
    include: [
      {
        model: Ingredient,
        as: 'recipeIngredients',
        through: { attributes: ['quantity', 'quantity_numeric', 'unit_es', 'unit_en', 'sibo_alert'] }
      }
    ]
  },
  hooks: {
    afterCreate: async (recipe, options) => {
      if (recipe._ingredientsData) {
        await syncIngredients(recipe, recipe._ingredientsData, options.transaction);
      }
    },
    afterUpdate: async (recipe, options) => {
      if (recipe._ingredientsData) {
        await syncIngredients(recipe, recipe._ingredientsData, options.transaction);
      }
    }
  }
});

// Helper sync function
async function syncIngredients(recipe, rawIngredients, transaction) {
  if (!Array.isArray(rawIngredients)) return;

  // 1. Delete existing associations
  await RecipeIngredient.destroy({
    where: { recipe_id: recipe.id },
    transaction
  });

  function parseQuantity(qty) {
    if (!qty) return null;
    const val = String(qty).trim().toLowerCase();
    if (!val) return null;

    const fractionMatch = val.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const num = parseInt(fractionMatch[1], 10);
      const den = parseInt(fractionMatch[2], 10);
      return den !== 0 ? num / den : null;
    }

    const mixedMatch = val.match(/^(\d+)[\s-]+(\d+)\/(\d+)$/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1], 10);
      const num = parseInt(mixedMatch[2], 10);
      const den = parseInt(mixedMatch[3], 10);
      return den !== 0 ? whole + (num / den) : null;
    }

    const floatVal = parseFloat(val);
    return isNaN(floatVal) ? null : floatVal;
  }

  // 2. Associate new ingredients
  for (const ing of rawIngredients) {
    let nameEs = '';
    let nameEn = '';
    
    if (ing.name && typeof ing.name === 'object') {
      nameEs = ing.name.es || '';
      nameEn = ing.name.en || nameEs;
    } else if (typeof ing.name === 'string') {
      nameEs = ing.name;
      nameEn = ing.name;
    } else if (typeof ing === 'string') {
      nameEs = ing;
      nameEn = ing;
    }

    nameEs = nameEs.trim();
    nameEn = nameEn.trim();

    if (!nameEs) continue;
    if (!nameEn) nameEn = nameEs;

    // Find or create ingredient
    let ingredient = await Ingredient.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('name_es')),
        nameEs.toLowerCase()
      ),
      transaction
    });

    if (!ingredient) {
      ingredient = await Ingredient.findOne({
        where: sequelize.where(
          sequelize.fn('LOWER', sequelize.col('name_en')),
          nameEn.toLowerCase()
        ),
        transaction
      });
    }

    if (!ingredient) {
      ingredient = await Ingredient.create({
        name_es: nameEs,
        name_en: nameEn
      }, { transaction });
    }

    const qtyStr = ing.quantity ? String(ing.quantity) : null;
    const qtyNum = parseQuantity(qtyStr);

    let unitEs = null;
    let unitEn = null;
    if (ing.unit && typeof ing.unit === 'object') {
      unitEs = ing.unit.es || null;
      unitEn = ing.unit.en || unitEs;
    } else if (typeof ing.unit === 'string') {
      unitEs = ing.unit || null;
      unitEn = ing.unit || null;
    }

    const siboAlert = ing.siboAlert === true || ing.sibo_alert === true;

    await RecipeIngredient.create({
      recipe_id: recipe.id,
      ingredient_id: ingredient.id,
      quantity: qtyStr,
      quantity_numeric: qtyNum,
      unit_es: unitEs,
      unit_en: unitEn,
      sibo_alert: siboAlert
    }, { transaction });
  }

  // Reload the association on the instance so that recipeIngredients is populated
  const updatedRecipe = await Recipe.findByPk(recipe.id, {
    include: [{ model: Ingredient, as: 'recipeIngredients' }],
    transaction
  });
  if (updatedRecipe) {
    recipe.recipeIngredients = updatedRecipe.recipeIngredients;
  }
}

Recipe.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Organization.hasMany(Recipe, { foreignKey: 'organization_id', as: 'recipes' });

Recipe.belongsToMany(Ingredient, { through: RecipeIngredient, as: 'recipeIngredients', foreignKey: 'recipe_id' });
Ingredient.belongsToMany(Recipe, { through: RecipeIngredient, as: 'recipes', foreignKey: 'ingredient_id' });

Recipe.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  values.ingredients = this.ingredients; // inject virtual ingredients
  return values;
};
