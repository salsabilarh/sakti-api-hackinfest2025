// migrations/create-unit-kerja.js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UnitKerjas', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      code: {
        type: Sequelize.STRING,
        unique: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
    
    // Insert default unit kerja
    await queryInterface.bulkInsert('UnitKerjas', [
      { name: 'SBU', code: 'SBU', createdAt: new Date(), updatedAt: new Date() },
      { name: 'PPK', code: 'PPK', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Cabang Balikpapan', code: 'CBP', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Cabang Surabaya', code: 'SBY', createdAt: new Date(), updatedAt: new Date() }
      // Tambahkan unit kerja lainnya sesuai kebutuhan
    ]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('UnitKerjas');
  }
};