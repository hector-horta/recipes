'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_activity_logs_action" ADD VALUE 'REMOVE_FAVORITE';
      `);
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('Value REMOVE_FAVORITE already exists in enum, skipping.');
      } else {
        throw err;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Enum values cannot be removed in Postgres easily
  }
};
