// migrations/create-role.js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Roles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT
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
    
    // Insert default roles
    await queryInterface.bulkInsert('Roles', [
      { name: 'admin', description: 'Full access', createdAt: new Date(), updatedAt: new Date() },
      { name: 'manajemen', description: 'Divisi SBU dan PPK', createdAt: new Date(), updatedAt: new Date() },
      { name: 'viewer', description: 'Read only access', createdAt: new Date(), updatedAt: new Date() },
      { name: 'pdo', description: 'Cabang access', createdAt: new Date(), updatedAt: new Date() }
    ]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Roles');
  }
};