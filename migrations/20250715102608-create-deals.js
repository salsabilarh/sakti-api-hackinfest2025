'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('deals', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      value: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      stage: {
        type: Sequelize.ENUM('lead', 'contacted', 'proposal_sent', 'tender', 'won', 'lost'),
        defaultValue: 'lead',
      },
      lost_reason: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      probability: {
        type: Sequelize.INTEGER,
        defaultValue: 10,
      },
      expected_close_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      unit_kerja_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'units',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      service_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'services',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      sector_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'sectors',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    await queryInterface.addConstraint('deals', {
      fields: ['probability'],
      type: 'check',
      where: {
        probability: {
          [Sequelize.Op.between]: [0, 100],
        },
      },
    });

    // Add indexes for foreign keys and frequently filtered columns
    await queryInterface.addIndex('deals', ['unit_kerja_id']);
    await queryInterface.addIndex('deals', ['created_by']);
    await queryInterface.addIndex('deals', ['service_id']);
    await queryInterface.addIndex('deals', ['sector_id']);
    await queryInterface.addIndex('deals', ['stage']);
    await queryInterface.addIndex('deals', ['expected_close_date']);
    await queryInterface.addIndex('deals', ['value']);
    await queryInterface.addIndex('deals', ['created_at']);
    
    // Composite index for stage + expected_close_date for reporting
    await queryInterface.addIndex('deals', ['stage', 'expected_close_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('deals');
  }
};
