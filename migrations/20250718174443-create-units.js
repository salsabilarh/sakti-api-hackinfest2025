// migrations/create-unit.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('units', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      name: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true,
      },
      type: {
        type: Sequelize.ENUM('sbu', 'ppk', 'cabang'),
        allowNull: false,
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

    await queryInterface.addIndex('units', ['type']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('units');
  }
};