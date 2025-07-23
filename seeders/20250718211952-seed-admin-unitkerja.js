'use strict';

const argon2 = require('argon2');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Buat password terenkripsi untuk admin
    const hashedPassword = await argon2.hash('Password123!');

    // Buat UUID untuk unit admin agar bisa digunakan di user
    const adminUnitId = uuidv4();

    // Seed Unit Kerja
    const units = [
      {
        id: uuidv4(),
        name: 'Cabang Surabaya',
        type: 'cabang',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Cabang Balikpapan',
        type: 'cabang',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'SBU AEBT',
        type: 'sbu',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Divisi PPK',
        type: 'ppk',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('units', units);

    // Seed Admin User
    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        full_name: 'Admin SUCOFINDO',
        email: 'admin@sucofindo.com',
        password: hashedPassword,
        role: 'admin',
        unit_kerja_id: null,
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', { email: 'admin@sucofindo.com' });
    await queryInterface.bulkDelete('units', {
      name: [
        'Cabang Surabaya',
        'Cabang Balikpapan',
        'SBU AEBT',
        'Divisi PPK',
      ],
    });
  },
};
