'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const user = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email='viewer@sucofindo.co.id' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    await queryInterface.bulkInsert('password_reset_requests', [
      { id: uuidv4(), user_id: user[0]?.id, is_processed: false, created_at: new Date() },
    ]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('password_reset_requests', null, {});
  }
};