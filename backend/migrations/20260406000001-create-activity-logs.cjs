'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ENUM type first (Postgres requires it)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_activity_logs_action" AS ENUM (
          'SEARCH', 'VIEW_RECIPE', 'ADD_FAVORITE', 'INGEST_SUCCESS', 'INGEST_FAIL'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.createTable('activity_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      action: {
        type: Sequelize.ENUM(
          'SEARCH', 'VIEW_RECIPE', 'ADD_FAVORITE', 'INGEST_SUCCESS', 'INGEST_FAIL'
        ),
        allowNull: false
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      failed_search: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      ip: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Indexes for the most common query patterns
    await queryInterface.addIndex('activity_logs', ['action'], {
      name: 'idx_activity_logs_action'
    });
    await queryInterface.addIndex('activity_logs', ['created_at'], {
      name: 'idx_activity_logs_created_at'
    });
    await queryInterface.addIndex('activity_logs', ['user_id'], {
      name: 'idx_activity_logs_user_id'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('activity_logs');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_activity_logs_action";'
    );
  }
};
