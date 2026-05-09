'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('change_requests', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
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
      current_unit_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'units',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        collate: 'utf8mb4_bin'
      },
      requested_unit_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'units',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        collate: 'utf8mb4_bin'
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
      },
      admin_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      requested_role: {
        type: Sequelize.ENUM('admin', 'management', 'viewer'),
        allowNull: true,
        comment: 'Role yang diminta (opsional, NULL = tidak berubah)'
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

    await queryInterface.addIndex('change_requests', ['status']);
    await queryInterface.addIndex('change_requests', ['user_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('change_requests');
  }
};