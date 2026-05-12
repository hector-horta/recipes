'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // We previously added organization_id to tags in another migration or attempt.
    // This script ensures it is removed, as tags must remain globally accessible.
    const tableInfo = await queryInterface.describeTable('tags');
    if (tableInfo.organization_id) {
      await queryInterface.removeColumn('tags', 'organization_id');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('tags');
    if (!tableInfo.organization_id) {
      await queryInterface.addColumn('tags', 'organization_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      await queryInterface.addIndex('tags', ['organization_id']);
    }
  }
};
