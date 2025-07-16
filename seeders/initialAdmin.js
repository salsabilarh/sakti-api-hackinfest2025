'use strict';
const { v4: uuidv4 } = require('uuid');
const argon2 = require('argon2');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Hash password untuk admin
    const hashedPassword = await argon2.hash('password123');
    
    return queryInterface.bulkInsert('users', [{
      id: uuidv4(),
      name: 'Administrator',
      email: 'admin@sucofindo.com',
      password: hashedPassword,
      role: 'Admin',
      is_verified: true,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      unit_kerja_id: null
    }]);
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('users', { email: 'admin@example.com' });
  }
};