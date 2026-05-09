'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const services = await queryInterface.sequelize.query(
      `SELECT id FROM services LIMIT 2`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const units = await queryInterface.sequelize.query(
      `SELECT id FROM units WHERE type='ppk' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    await queryInterface.bulkInsert('service_revenues', [
      { id: uuidv4(), customer_name: 'PT Bank Maju', revenue: 500000000, service_id: services[0]?.id, unit_id: units[0]?.id, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), customer_name: 'PT Telekom Indonesia', revenue: 750000000, service_id: services[1]?.id, unit_id: units[0]?.id, created_at: new Date(), updated_at: new Date() },
    ]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('service_revenues', null, {});
  }
};