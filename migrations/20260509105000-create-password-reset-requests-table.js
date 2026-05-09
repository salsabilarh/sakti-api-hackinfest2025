'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('password_reset_requests', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        collate: 'utf8mb4_bin'
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        collate: 'utf8mb4_bin'
      },
      is_processed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      processed_by: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        collate: 'utf8mb4_bin'
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('password_reset_requests', ['is_processed']);
    await queryInterface.addIndex('password_reset_requests', ['user_id']);
    await queryInterface.addIndex('password_reset_requests', ['is_processed', 'created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('password_reset_requests');
  }
};