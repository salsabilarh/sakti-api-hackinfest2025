'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        collate: 'utf8mb4_bin'
      },
      full_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      role: {
        type: Sequelize.STRING(15),
        allowNull: false,
        defaultValue: 'viewer'
      },
      unit_kerja_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'units',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        collate: 'utf8mb4_bin'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      last_login: {
        type: Sequelize.DATE,
        allowNull: true
      },
      reset_token: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      reset_token_expires: {
        type: Sequelize.DATE,
        allowNull: true
      },
      temporary_password: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Additional indexes
    await queryInterface.addIndex('users', ['email'], { unique: true, name: 'idx_users_email' });
    await queryInterface.addIndex('users', ['is_verified']);
    await queryInterface.addIndex('users', ['last_login']);
    await queryInterface.addIndex('users', ['unit_kerja_id']);
    await queryInterface.addIndex('users', ['role']);
    await queryInterface.addIndex('users', ['is_active', 'is_verified']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};