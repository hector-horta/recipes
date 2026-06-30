'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create user_organizations join table
    await queryInterface.createTable('user_organizations', {
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        primaryKey: true
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        primaryKey: true
      },
      role: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'user'
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

    // 2. Data Migration: Move existing organization_id from users to user_organizations
    const users = await queryInterface.sequelize.query(
      `SELECT id, organization_id, role FROM users WHERE organization_id IS NOT NULL;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (users.length > 0) {
      const userOrgs = users.map(user => ({
        user_id: user.id,
        organization_id: user.organization_id,
        role: user.role || 'user',
        created_at: new Date(),
        updated_at: new Date()
      }));

      await queryInterface.bulkInsert('user_organizations', userOrgs);
    }

    // 3. Remove organization_id column from users table
    await queryInterface.removeColumn('users', 'organization_id');
  },

  down: async (queryInterface, Sequelize) => {
    // 1. Re-add organization_id column to users
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

    // 2. Data Restoration (Optional/Partial): Bring back one link per user
    // This is tricky for many-to-many, so we just bring back the first one found
    const userOrgs = await queryInterface.sequelize.query(
      `SELECT user_id, organization_id FROM user_organizations;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const link of userOrgs) {
      await queryInterface.sequelize.query(
        `UPDATE users SET organization_id = :orgId WHERE id = :userId AND organization_id IS NULL;`,
        {
          replacements: { orgId: link.organization_id, userId: link.user_id },
          type: Sequelize.QueryTypes.UPDATE
        }
      );
    }

    // 3. Drop user_organizations table
    await queryInterface.dropTable('user_organizations');
  }
};
