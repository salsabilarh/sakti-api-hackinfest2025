'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('services', 'sub_portfolio_code', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    // Optional: isi data berdasarkan sub_portfolio relasi yang sudah ada
    await queryInterface.sequelize.query(`
      UPDATE services
      SET sub_portfolio_code = sp.code
      FROM sub_portfolios sp
      WHERE services.sub_portfolio_id = sp.id
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('services', 'sub_portfolio_code');
  },
};
