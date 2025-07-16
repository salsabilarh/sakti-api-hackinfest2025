'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('services', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      code: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(300),
        allowNull: false,
        unique: true
      },
      sub_portofolio_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'sub_portofolios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      service_group: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      description_service: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      benefit: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      scope: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      output: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      regulation_ref: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      sbu_owner: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('services', ['sub_portofolio_id']);
    await queryInterface.addIndex('services', ['service_group']);
    await queryInterface.addIndex('services', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('services');
  }
};