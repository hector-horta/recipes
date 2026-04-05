'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('favorite_recipes');
    
    if (tableInfo.spoonacular_id) {
      await queryInterface.removeColumn('favorite_recipes', 'spoonacular_id');
    }

    if (!tableInfo.recipe_id) {
      await queryInterface.addColumn('favorite_recipes', 'recipe_id', {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'recipes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    } else {
      await queryInterface.changeColumn('favorite_recipes', 'recipe_id', {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'recipes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('favorite_recipes', 'recipe_id');
    await queryInterface.addColumn('favorite_recipes', 'spoonacular_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  }
};
