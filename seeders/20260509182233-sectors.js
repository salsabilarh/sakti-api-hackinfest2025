'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('sectors', [
      { id: uuidv4(), name: 'Perbankan', code: 'BANK', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Energi', code: 'ENER', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Telekomunikasi', code: 'TELCO', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Manufaktur', code: 'MANU', created_at: new Date(), updated_at: new Date() },
    ]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('sectors', null, {});
  }
};