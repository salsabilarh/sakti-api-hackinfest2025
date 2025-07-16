'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('service_marketing_kits', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      service_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'services',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      file_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      file_type: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      file_size: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      uploaded_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      uploaded_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    
    // Add indexes for foreign keys and searchable columns
    await queryInterface.addIndex('service_marketing_kits', ['service_id']);
    await queryInterface.addIndex('service_marketing_kits', ['uploaded_by']);
    await queryInterface.addIndex('service_marketing_kits', ['file_type']);
    await queryInterface.addIndex('service_marketing_kits', ['uploaded_at']);
    
    // Composite index for service_id + file_name to prevent duplicates
    await queryInterface.addConstraint('service_marketing_kits', {
      fields: ['service_id', 'file_name'],
      type: 'unique',
      name: 'service_marketing_kits_service_file_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('service_marketing_kits', 'service_marketing_kits_service_file_unique');
    await queryInterface.dropTable('service_marketing_kits');
  }
};