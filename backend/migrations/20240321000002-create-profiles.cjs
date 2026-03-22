'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('profiles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      diet: {
        type: Sequelize.ENUM('None', 'Vegan', 'Vegetarian', 'Keto', 'Paleo', 'SIBO'),
        allowNull: false,
        defaultValue: 'None'
      },
      intolerances: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      excluded_ingredients: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: ''
      },
      daily_calories: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 2000
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('profiles');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_profiles_diet";');
  }
};
