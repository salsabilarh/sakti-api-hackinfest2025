'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('services', 'name', {
      type: Sequelize.STRING(255),
      allowNull: false,
      unique: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Kembalikan ke panjang awal jika diperlukan
    await queryInterface.changeColumn('services', 'name', {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true,
    });
  }
};
