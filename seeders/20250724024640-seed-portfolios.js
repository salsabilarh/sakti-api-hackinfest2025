'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('portfolios', [
      {
        id: uuidv4(),
        name: 'Aset Energi Baru Terbarukan',
        code: 'AEB',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Industri',
        code: 'IND',
        created_at: new Date(),
        updated_at: new Date(),
      }
    ], {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('portfolios', null, {});
  }
};
