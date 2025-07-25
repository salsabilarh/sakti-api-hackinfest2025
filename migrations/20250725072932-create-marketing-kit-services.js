'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('marketing_kit_services', {
      marketing_kit_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        references: {
          model: 'marketing_kits',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      service_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        references: {
          model: 'services',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Copy existing service_id into pivot table
    await queryInterface.sequelize.query(`
      INSERT INTO marketing_kit_services (marketing_kit_id, service_id, created_at)
      SELECT id, service_id, CURRENT_TIMESTAMP FROM marketing_kits WHERE service_id IS NOT NULL
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('marketing_kit_services');
  },
};
