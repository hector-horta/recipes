'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable('profiles');
    if (!tableDefinition.conditions) {
      await queryInterface.addColumn('profiles', 'conditions', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable('profiles');
    if (tableDefinition.conditions) {
      await queryInterface.removeColumn('profiles', 'conditions');
    }
  }
};
