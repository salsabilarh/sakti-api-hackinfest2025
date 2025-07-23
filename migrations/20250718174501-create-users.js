'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      full_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      temporary_password: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      role: {
        type: Sequelize.STRING(15),
        defaultValue: 'viewer',
        allowNull: false,
      },
      unit_kerja_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'units',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: null,
      },
      last_login: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reset_token: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      reset_token_expires: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['unit_kerja_id']);
    await queryInterface.addIndex('users', ['role']);
    await queryInterface.addIndex('users', ['is_verified']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};