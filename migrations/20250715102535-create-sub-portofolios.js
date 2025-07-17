'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sub_portofolios', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      portofolio_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'portofolios',
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
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Composite unique untuk code+name
    await queryInterface.addConstraint('sub_portofolios', {
      fields: ['code', 'name'],
      type: 'unique',
      name: 'sub_portofolios_code_name_unique'
    });

    // Unique code per portofolio
    await queryInterface.addConstraint('sub_portofolios', {
      fields: ['portofolio_id', 'code'],
      type: 'unique',
      name: 'sub_portofolios_portofolio_code_unique'
    });

    // Index untuk performa
    await queryInterface.addIndex('sub_portofolios', ['portofolio_id']);
    await queryInterface.addIndex('sub_portofolios', ['name']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('sub_portofolios', 'sub_portofolios_code_name_unique');
    await queryInterface.removeConstraint('sub_portofolios', 'sub_portofolios_portofolio_code_unique');
    await queryInterface.dropTable('sub_portofolios');
  }
};