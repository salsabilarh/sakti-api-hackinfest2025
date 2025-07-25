'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface) => {
    // Pastikan ID-nya sesuai dengan ID portfolio yang dimasukkan sebelumnya
    const portfolios = await queryInterface.sequelize.query(
      `SELECT id, code FROM portfolios;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const aeb = portfolios.find(p => p.code === 'AEB');
    const ind = portfolios.find(p => p.code === 'IND');

    await queryInterface.bulkInsert('sub_portfolios', [
      {
        id: uuidv4(),
        portfolio_id: aeb.id,
        name: 'Sampling dan analisa di bidang EBT (Gas metana, Shale gas, Panas bumi dan lainnya)',
        code: 'AEB-1',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        portfolio_id: aeb.id,
        name: 'Inspeksi Peralatan dan Instalasi Industri Minyak dan Gas Bumi (non-statutory/non-regulasi)',
        code: 'AEB-2',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        portfolio_id: ind.id,
        name: 'Jasa verifikasi, Inspeksi dan Pengujian Peralatan (Non NDT) dan Instalasi Industri Non Migas',
        code: 'IND-1',
        created_at: new Date(),
        updated_at: new Date(),
      }
    ], {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('sub_portfolios', null, {});
  }
};
