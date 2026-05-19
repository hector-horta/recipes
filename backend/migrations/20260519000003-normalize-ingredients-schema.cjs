'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Crear tabla ingredients
    await queryInterface.createTable('ingredients', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      name_es: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      name_en: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      calories: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      protein: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      carbs: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      fat: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // 2. Crear tabla recipe_ingredients
    await queryInterface.createTable('recipe_ingredients', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      recipe_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'recipes',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      ingredient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ingredients',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      quantity: {
        type: Sequelize.STRING,
        allowNull: true
      },
      quantity_numeric: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      unit_es: {
        type: Sequelize.STRING,
        allowNull: true
      },
      unit_en: {
        type: Sequelize.STRING,
        allowNull: true
      },
      sibo_alert: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Indexes for fast querying
    await queryInterface.addIndex('recipe_ingredients', ['recipe_id'], {
      name: 'idx_recipe_ingredients_recipe_id'
    });
    await queryInterface.addIndex('recipe_ingredients', ['ingredient_id'], {
      name: 'idx_recipe_ingredients_ingredient_id'
    });

    // 3. Migración de datos existentes
    const recipes = await queryInterface.sequelize.query(
      'SELECT id, ingredients FROM recipes;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    function parseQuantity(qty) {
      if (!qty) return null;
      const val = String(qty).trim().toLowerCase();
      if (!val) return null;

      // Handle fractions like "1/2", "1/4", "3/4"
      const fractionMatch = val.match(/^(\d+)\/(\d+)$/);
      if (fractionMatch) {
        const num = parseInt(fractionMatch[1], 10);
        const den = parseInt(fractionMatch[2], 10);
        return den !== 0 ? num / den : null;
      }

      // Handle mixed numbers like "1 1/2" or "1-1/2"
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

    for (const recipe of recipes) {
      let rawIngredients = [];
      if (typeof recipe.ingredients === 'string') {
        try {
          rawIngredients = JSON.parse(recipe.ingredients);
        } catch (e) {
          rawIngredients = [];
        }
      } else if (Array.isArray(recipe.ingredients)) {
        rawIngredients = recipe.ingredients;
      }

      if (!Array.isArray(rawIngredients)) continue;

      for (const ing of rawIngredients) {
        let nameEs = '';
        let nameEn = '';
        
        // Extract names
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

        // Find or create ingredient (case-insensitive for unique match, but we insert unique name)
        let ingredient = await queryInterface.sequelize.query(
          'SELECT id FROM ingredients WHERE LOWER(name_es) = LOWER($1);',
          {
            bind: [nameEs],
            type: queryInterface.sequelize.QueryTypes.SELECT
          }
        );

        let ingredientId;
        if (ingredient && ingredient.length > 0) {
          ingredientId = ingredient[0].id;
        } else {
          const insertResult = await queryInterface.sequelize.query(
            'INSERT INTO ingredients (id, name_es, name_en, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) RETURNING id;',
            {
              bind: [nameEs, nameEn],
              type: queryInterface.sequelize.QueryTypes.INSERT
            }
          );
          ingredientId = insertResult[0][0].id;
        }

        // Parse quantity
        const qtyStr = ing.quantity ? String(ing.quantity) : null;
        const qtyNum = parseQuantity(qtyStr);

        // Extract units
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

        // Insert recipe_ingredients row
        await queryInterface.sequelize.query(
          `INSERT INTO recipe_ingredients 
            (id, recipe_id, ingredient_id, quantity, quantity_numeric, unit_es, unit_en, sibo_alert, created_at, updated_at) 
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW());`,
          {
            bind: [recipe.id, ingredientId, qtyStr, qtyNum, unitEs, unitEn, siboAlert]
          }
        );
      }
    }

    // 4. Quitar la columna ingredients de la tabla recipes
    await queryInterface.removeColumn('recipes', 'ingredients');
  },

  async down(queryInterface, Sequelize) {
    // 1. Agregar de nuevo la columna ingredients a recipes
    await queryInterface.addColumn('recipes', 'ingredients', {
      type: Sequelize.JSONB,
      defaultValue: []
    });

    // 2. Re-poblar la columna JSONB ingredients a partir de las relaciones
    const recipes = await queryInterface.sequelize.query(
      'SELECT id FROM recipes;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const recipe of recipes) {
      const rels = await queryInterface.sequelize.query(
        `SELECT ri.quantity, ri.unit_es, ri.unit_en, ri.sibo_alert, i.name_es, i.name_en 
         FROM recipe_ingredients ri 
         JOIN ingredients i ON ri.ingredient_id = i.id 
         WHERE ri.recipe_id = $1;`,
        {
          bind: [recipe.id],
          type: queryInterface.sequelize.QueryTypes.SELECT
        }
      );

      const ingredientsJson = rels.map(r => ({
        name: { es: r.name_es, en: r.name_en },
        quantity: r.quantity || '',
        unit: { es: r.unit_es || '', en: r.unit_en || '' },
        siboAlert: r.sibo_alert
      }));

      await queryInterface.sequelize.query(
        'UPDATE recipes SET ingredients = $1 WHERE id = $2;',
        {
          bind: [JSON.stringify(ingredientsJson), recipe.id]
        }
      );
    }

    // 3. Eliminar tablas creadas
    await queryInterface.dropTable('recipe_ingredients');
    await queryInterface.dropTable('ingredients');
  }
};
