// migrations/create-jasa-sektor.js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('JasaSektors', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      jasa_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Jasas',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      sektor_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Sektors',
          key: 'id'
        }
      },
      sub_sektor_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'SubSektors',
          key: 'id'
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('JasaSektors');
  }
};