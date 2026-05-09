'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('download_logs', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        collate: 'utf8mb4_bin'
      },
      purpose: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      marketing_kit_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'marketing_kits',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        collate: 'utf8mb4_bin'
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        collate: 'utf8mb4_bin'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('download_logs', ['user_id']);
    await queryInterface.addIndex('download_logs', ['marketing_kit_id']);
    await queryInterface.addIndex('download_logs', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('download_logs');
  }
};