// seeders/XXXX-initial-data.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Insert unit kerja
    await queryInterface.bulkInsert('unit_kerja', [
      { name: 'SBU', code: 'SBU', description: 'Strategic Business Unit' },
      { name: 'PPK', code: 'PPK', description: 'Pusat Pengembangan Keahlian' },
      { name: 'Cabang Balikpapan', code: 'CBP', description: 'Cabang Balikpapan' },
      { name: 'Cabang Surabaya', code: 'SBY', description: 'Cabang Surabaya' },
      // Add more as needed
    ], {});
    
    // Insert admin user
    await queryInterface.bulkInsert('users', [{
      name: 'Admin',
      email: 'admin@example.com',
      password: '$argon2i$v=19$m=4096,t=3,p=1$YWFhYWFhYWE$MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI', // hashed 'password'
      unit_kerja_id: 1, // SBU
      role: 'admin',
      verified: true,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }], {});
    
    // Insert some portfolio data
    await queryInterface.bulkInsert('portfolios', [
      { name: 'Portfolio 1', code: 'P1', description: 'First portfolio' },
      { name: 'Portfolio 2', code: 'P2', description: 'Second portfolio' }
    ], {});
    
    // Insert some sectors
    await queryInterface.bulkInsert('sectors', [
      { name: 'Sector 1', code: 'S1', description: 'First sector' },
      { name: 'Sector 2', code: 'S2', description: 'Second sector' }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('unit_kerja', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('portfolios', null, {});
    await queryInterface.bulkDelete('sectors', null, {});
  }
};