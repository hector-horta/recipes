'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable('profiles');
    if (!tableDefinition.language) {
      await queryInterface.addColumn('profiles', 'language', {
        type: Sequelize.STRING(5),
        allowNull: false,
        defaultValue: 'en'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable('profiles');
    if (tableDefinition.language) {
      await queryInterface.removeColumn('profiles', 'language');
    }
  }
};
