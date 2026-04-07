'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('search_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      term: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('failed', 'suggested'),
        defaultValue: 'failed'
      },
      conversion: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      ip: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('search_logs', ['term']);
    await queryInterface.addIndex('search_logs', ['status']);
    await queryInterface.addIndex('search_logs', ['created_at']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('search_logs');
  }
};
