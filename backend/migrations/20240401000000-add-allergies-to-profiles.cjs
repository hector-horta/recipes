'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable('profiles');
    if (!tableDefinition.allergies) {
      await queryInterface.addColumn('profiles', 'allergies', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable('profiles');
    if (tableDefinition.allergies) {
      await queryInterface.removeColumn('profiles', 'allergies');
    }
  }
};
