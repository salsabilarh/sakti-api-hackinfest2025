'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sectors = await queryInterface.sequelize.query(
      `SELECT id, code FROM sectors WHERE code IN ('BANK','ENER','TELCO','MANU')`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const findId = (code) => sectors.find(s => s.code === code).id;
    await queryInterface.bulkInsert('sub_sectors', [
      { id: uuidv4(), name: 'Perbankan Digital', code: 'BANK-DIG', sector_id: findId('BANK'), created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Perbankan Konvensional', code: 'BANK-KON', sector_id: findId('BANK'), created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Energi Terbarukan', code: 'ENER-REN', sector_id: findId('ENER'), created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Telekomunikasi Seluler', code: 'TELCO-MOB', sector_id: findId('TELCO'), created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Manufaktur Otomotif', code: 'MANU-AUTO', sector_id: findId('MANU'), created_at: new Date(), updated_at: new Date() },
    ]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('sub_sectors', null, {});
  }
};