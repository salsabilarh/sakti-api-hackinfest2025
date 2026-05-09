'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('portfolios', [
      { id: uuidv4(), name: 'Digital Transformation', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Cybersecurity', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Infrastructure', created_at: new Date(), updated_at: new Date() },
    ]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('portfolios', null, {});
  }
};