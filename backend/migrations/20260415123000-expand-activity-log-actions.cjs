'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const newValues = [
      'SYSTEM_ERROR',
      'USER_REGISTERED',
      'LOGIN_SUCCESS',
      'LOGIN_UNVERIFIED',
      'EMAIL_VERIFIED',
      'EMAIL_RESENT',
      'SUGGEST_TO_CHEF',
      'SYSTEM',
      'ERROR'
    ];

    for (const value of newValues) {
      try {
        // Postgres 12+ support ADD VALUE IF NOT EXISTS is limited inside transactions.
        // We use a try-catch pattern or check before adding.
        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_activity_logs_action" ADD VALUE '${value}';
        `);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`Value ${value} already exists in enum, skipping.`);
        } else {
          throw err;
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Postgres does not support removing values from an enum type.
    // Rolling back would require recreating the table or leaving the enum as is.
    // Since this is just adding valid log types, we leave them.
  }
};
