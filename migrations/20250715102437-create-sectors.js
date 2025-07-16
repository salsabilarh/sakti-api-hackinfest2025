'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sectors', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      code: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.TEXT,
        allowNull: false,
        unique: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Composite unique constraint untuk memastikan tidak ada duplikasi kombinasi code+name
    await queryInterface.addConstraint('sectors', {
      fields: ['code', 'name'],
      type: 'unique',
      name: 'sectors_code_name_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('sectors', 'sectors_code_name_unique');
    await queryInterface.dropTable('sectors');
  }
};