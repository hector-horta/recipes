'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = ['activity_logs', 'search_logs', 'favorite_recipes'];

    for (const table of tables) {
      const tableInfo = await queryInterface.describeTable(table);
      
      if (!tableInfo.organization_id) {
        await queryInterface.addColumn(table, 'organization_id', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'organizations',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });

        // Add index for performance
        await queryInterface.addIndex(table, ['organization_id']);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tables = ['activity_logs', 'search_logs', 'favorite_recipes'];

    for (const table of tables) {
      await queryInterface.removeColumn(table, 'organization_id');
    }
  }
};
