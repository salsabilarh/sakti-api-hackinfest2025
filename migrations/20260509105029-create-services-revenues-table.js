'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('service_revenues', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        defaultValue: Sequelize.literal('UUID()'),  // MySQL/MariaDB UUID() function
        collate: 'utf8mb4_bin'
      },
      service_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'services',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        collate: 'utf8mb4_bin'
      },
      unit_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'units',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        collate: 'utf8mb4_bin'
      },
      customer_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      revenue: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('service_revenues', ['service_id']);
    await queryInterface.addIndex('service_revenues', ['unit_id']);
    await queryInterface.addIndex('service_revenues', ['customer_name']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('service_revenues');
  }
};