'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Ambil id portfolio dari database (gunakan raw query supaya tidak hardcode)
    const portfolios = await queryInterface.sequelize.query(
      `SELECT id, name FROM portfolios WHERE name IN ('Digital Transformation', 'Cybersecurity', 'Infrastructure')`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const findId = (name) => portfolios.find(p => p.name === name).id;
    await queryInterface.bulkInsert('sub_portfolios', [
      { id: uuidv4(), name: 'Digital Apps', code: 'DIG-APP', portfolio_id: findId('Digital Transformation'), created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Cloud Services', code: 'CLD-SRV', portfolio_id: findId('Digital Transformation'), created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Security Audit', code: 'SEC-AUD', portfolio_id: findId('Cybersecurity'), created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Penetration Testing', code: 'PEN-TEST', portfolio_id: findId('Cybersecurity'), created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Network Solutions', code: 'NET-SOL', portfolio_id: findId('Infrastructure'), created_at: new Date(), updated_at: new Date() },
    ]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('sub_portfolios', null, {});
  }
};