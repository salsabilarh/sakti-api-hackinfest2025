'use strict';

const argon2 = require('argon2');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Buat password terenkripsi untuk admin
    const hashedPassword = await argon2.hash('Password123!');

    // Seed Admin User
    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        full_name: 'Admin',
        email: 'admin@sucofindo.com',
        password: hashedPassword,
        role: 'admin',
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', { email: 'admin@sucofindo.com' });
  },
};
