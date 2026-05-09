'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('services', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        collate: 'utf8mb4_bin'
      },
      name: {
        type: Sequelize.STRING(500),
        allowNull: false,
        unique: true
      },
      code: {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true
      },
      group: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      overview: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      scope: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      benefit: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      output: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      regulation_ref: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      intro_video_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      portfolio_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'portfolios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        collate: 'utf8mb4_bin'
      },
      sub_portfolio_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'sub_portfolios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        collate: 'utf8mb4_bin'
      },
      sbu_owner_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'units',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        collate: 'utf8mb4_bin'
      },
      created_by: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        collate: 'utf8mb4_bin'
      },
      sub_portfolio_code: {
        type: Sequelize.STRING(20),
        allowNull: true
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

    // Additional indexes
    await queryInterface.addIndex('services', ['portfolio_id']);
    await queryInterface.addIndex('services', ['sub_portfolio_id']);
    await queryInterface.addIndex('services', ['sbu_owner_id']);
    await queryInterface.addIndex('services', ['created_by']);
    await queryInterface.addIndex('services', ['code']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('services');
  }
};