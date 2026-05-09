'use strict';
const { v4: uuidv4 } = require('uuid');
const argon2 = require('argon2');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Hash password dengan argon2
    const hashedPassword = await argon2.hash('password123');
    
    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        full_name: 'Admin Utama',
        email: 'admin@sucofindo.co.id',
        password: hashedPassword,
        role: 'admin',
        unit_kerja_id: null,
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        full_name: 'Manajer SBU Digital',
        email: 'manager.digital@sucofindo.co.id',
        password: hashedPassword,
        role: 'management',
        unit_kerja_id: (await queryInterface.sequelize.query(`SELECT id FROM units WHERE code='SBU-D'`, { type: Sequelize.QueryTypes.SELECT }))[0]?.id,
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        full_name: 'Viewer Test',
        email: 'viewer@sucofindo.co.id',
        password: hashedPassword,
        role: 'viewer',
        unit_kerja_id: (await queryInterface.sequelize.query(`SELECT id FROM units WHERE code='PPK-JKT'`, { type: Sequelize.QueryTypes.SELECT }))[0]?.id,
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  }
};