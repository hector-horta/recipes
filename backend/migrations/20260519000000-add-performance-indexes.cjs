'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Índice para búsquedas rápidas de recetas globales / tenant-specific y por estado (published, draft, etc.)
    await queryInterface.addIndex('recipes', ['organization_id', 'status'], {
      name: 'recipes_organization_id_status_idx'
    });

    // 2. Índice en slug para búsquedas rápidas por slug y validaciones de unicidad
    await queryInterface.addIndex('recipes', ['slug'], {
      name: 'recipes_slug_idx'
    });

    // 3. Índice compuesto para optimizar las consultas de agregación del panel de administración (stats)
    await queryInterface.addIndex('activity_logs', ['action', 'created_at'], {
      name: 'activity_logs_action_created_at_idx'
    });

    // 4. Índice compuesto para búsquedas y agregaciones de favoritos por receta y usuario
    await queryInterface.addIndex('favorite_recipes', ['recipe_id', 'user_id'], {
      name: 'favorite_recipes_recipe_id_user_id_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('favorite_recipes', 'favorite_recipes_recipe_id_user_id_idx');
    await queryInterface.removeIndex('activity_logs', 'activity_logs_action_created_at_idx');
    await queryInterface.removeIndex('recipes', 'recipes_slug_idx');
    await queryInterface.removeIndex('recipes', 'recipes_organization_id_status_idx');
  }
};
