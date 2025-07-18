// migrations/create-jasa.js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Jasas', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      kelompok_jasa: {
        type: Sequelize.STRING
      },
      overview: {
        type: Sequelize.TEXT
      },
      url_intro_video: {
        type: Sequelize.STRING
      },
      ruang_lingkup: {
        type: Sequelize.TEXT
      },
      manfaat: {
        type: Sequelize.TEXT
      },
      output: {
        type: Sequelize.TEXT
      },
      regulation_ref: {
        type: Sequelize.TEXT
      },
      sbu_owner_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'UnitKerjas',
          key: 'id'
        }
      },
      sub_portfolio_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'SubPortfolios',
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
    await queryInterface.dropTable('Jasas');
  }
};