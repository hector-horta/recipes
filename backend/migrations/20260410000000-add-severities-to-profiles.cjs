'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable('profiles');
    if (!tableDefinition.severities) {
      await queryInterface.addColumn('profiles', 'severities', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable('profiles');
    if (tableDefinition.severities) {
      await queryInterface.removeColumn('profiles', 'severities');
    }
  }
};
