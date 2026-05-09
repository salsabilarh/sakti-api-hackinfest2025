'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const kit = await queryInterface.sequelize.query(
      `SELECT id FROM marketing_kits LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const user = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email='viewer@sucofindo.co.id' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    await queryInterface.bulkInsert('download_logs', [
      { id: uuidv4(), marketing_kit_id: kit[0]?.id, user_id: user[0]?.id, purpose: 'Presentasi ke klien', created_at: new Date() },
    ]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('download_logs', null, {});
  }
};