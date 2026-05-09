'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const user = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email='viewer@sucofindo.co.id' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const currentUnit = await queryInterface.sequelize.query(
      `SELECT id FROM units WHERE code='PPK-SBY' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const requestedUnit = await queryInterface.sequelize.query(
      `SELECT id FROM units WHERE code='PPK-JKT' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    await queryInterface.bulkInsert('change_requests', [
      { id: uuidv4(), user_id: user[0]?.id, current_unit_id: currentUnit[0]?.id, requested_unit_id: requestedUnit[0]?.id, status: 'pending', admin_notes: null, created_at: new Date(), updated_at: new Date() },
    ]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('change_requests', null, {});
  }
};