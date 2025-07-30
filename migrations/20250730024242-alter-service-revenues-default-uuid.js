'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Ubah kolom 'id' agar default value-nya UUID()
    await queryInterface.changeColumn('service_revenues', 'id', {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.literal('(UUID())'),
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Kembalikan ke kondisi sebelumnya tanpa default
    await queryInterface.changeColumn('service_revenues', 'id', {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: null,
    });
  },
};
