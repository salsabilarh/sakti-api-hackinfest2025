'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('service_sector_maps', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      service_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'services',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sector_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'sectors',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    });

    await queryInterface.addIndex('service_sector_maps', ['service_id', 'sector_id'], {
      unique: true,
      name: 'service_sector_maps_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('service_sector_maps');
  }
};