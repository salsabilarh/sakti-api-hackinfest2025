'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sub_sectors', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
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
      code: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Composite unique untuk memastikan code unik dalam sector yang sama
    await queryInterface.addConstraint('sub_sectors', {
      fields: ['sector_id', 'code'],
      type: 'unique',
      name: 'sub_sectors_sector_code_unique'
    });

    // Index untuk mempercepat pencarian
    await queryInterface.addIndex('sub_sectors', ['sector_id']);
    await queryInterface.addIndex('sub_sectors', ['name']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('sub_sectors', 'sub_sectors_sector_code_unique');
    await queryInterface.dropTable('sub_sectors');
  }
}; 