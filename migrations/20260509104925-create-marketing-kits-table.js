'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('marketing_kits', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        collate: 'utf8mb4_bin'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      file_path: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      file_type: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      uploaded_by: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        collate: 'utf8mb4_bin'
      },
      cloudinary_public_id: {
        type: Sequelize.STRING(255),
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

    await queryInterface.addIndex('marketing_kits', ['uploaded_by']);
    await queryInterface.addIndex('marketing_kits', ['file_type']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('marketing_kits');
  }
};