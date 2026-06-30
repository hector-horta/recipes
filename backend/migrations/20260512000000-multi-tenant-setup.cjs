'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Crear tabla organizations si no existe
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('organizations')) {
      await queryInterface.createTable('organizations', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          primaryKey: true
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        slug: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        settings: {
          type: Sequelize.JSONB,
          defaultValue: {}
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
    }

    // 2. Modificar tabla users
    const userTable = await queryInterface.describeTable('users');
    
    if (!userTable.role) {
      await queryInterface.addColumn('users', 'role', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'user'
      });
    }

    if (!userTable.organization_id) {
      await queryInterface.addColumn('users', 'organization_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    // 3. Modificar tabla recipes
    const recipeTable = await queryInterface.describeTable('recipes');
    
    if (!recipeTable.organization_id) {
      await queryInterface.addColumn('recipes', 'organization_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('recipes', 'organization_id');
    await queryInterface.removeColumn('users', 'organization_id');
    await queryInterface.removeColumn('users', 'role');
    await queryInterface.dropTable('organizations');
  }
};
