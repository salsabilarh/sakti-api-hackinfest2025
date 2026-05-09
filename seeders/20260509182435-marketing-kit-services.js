'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const kits = await queryInterface.sequelize.query(
      `SELECT id FROM marketing_kits`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const services = await queryInterface.sequelize.query(
      `SELECT id FROM services`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const records = [];
    for (let i = 0; i < Math.min(kits.length, services.length); i++) {
      records.push({ marketing_kit_id: kits[i].id, service_id: services[i].id, created_at: new Date() });
    }
    await queryInterface.bulkInsert('marketing_kit_services', records);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('marketing_kit_services', null, {});
  }
};