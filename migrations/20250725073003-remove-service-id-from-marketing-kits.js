'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('marketing_kits', 'service_id');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('marketing_kits', 'service_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'services',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  }
};
