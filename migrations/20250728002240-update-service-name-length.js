'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('services', 'name', {
      type: Sequelize.STRING(500),
      allowNull: false,
      unique: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('services', 'name', {
      type: Sequelize.STRING(500),
      allowNull: false,
      unique: true,
    });
  }
};
