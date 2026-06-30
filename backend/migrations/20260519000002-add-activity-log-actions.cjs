'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const newActions = [
      'NUTRI_RECIPE_CREATE',
      'NUTRI_RECIPE_UPDATE',
      'NUTRI_RECIPE_DELETE',
      'NUTRI_PLAN_CREATE',
      'NUTRI_PLAN_UPDATE',
      'NUTRI_PLAN_DELETE',
      'ADMIN_RECIPE_CREATE',
      'ADMIN_RECIPE_UPDATE',
      'ADMIN_RECIPE_DELETE',
      'ADMIN_TAG_CREATE',
      'ADMIN_TAG_UPDATE',
      'ADMIN_TAG_DELETE',
      'ADMIN_ORG_CREATE',
      'ADMIN_ORG_UPDATE',
      'ADMIN_ORG_TOGGLE_STATUS',
      'ADMIN_ORG_USER_ADD',
      'ADMIN_ORG_USER_BULK',
      'ADMIN_ORG_USER_REMOVE',
      'ERROR'
    ];

    // PostgreSQL does not support ALTER TYPE ADD VALUE within a transaction block in older versions,
    // but running them sequentially with check is safe.
    for (const action of newActions) {
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_activity_logs_action" ADD VALUE IF NOT EXISTS '${action}';
      `);
    }
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL does not support removing values from an ENUM type.
    // Reverting this migration is a no-op since the presence of these enum values does not impact functionality.
  }
};
