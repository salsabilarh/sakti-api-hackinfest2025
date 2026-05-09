'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const unitsData = [
      { name: 'Kantor Pusat', code: 'KP', type: 'cabang' },
      { name: 'SBU Digital', code: 'SBU-D', type: 'sbu' },
      { name: 'SBU Infrastruktur', code: 'SBU-I', type: 'sbu' },
      { name: 'PPK Jakarta', code: 'PPK-JKT', type: 'ppk' },
      { name: 'PPK Surabaya', code: 'PPK-SBY', type: 'ppk' },
    ];
    
    for (const unit of unitsData) {
      // Cek apakah sudah ada berdasarkan name atau code
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM units WHERE name = :name OR code = :code LIMIT 1`,
        { replacements: { name: unit.name, code: unit.code }, type: Sequelize.QueryTypes.SELECT }
      );
      if (existing.length === 0) {
        await queryInterface.bulkInsert('units', [{
          id: uuidv4(),
          name: unit.name,
          code: unit.code,
          type: unit.type,
          created_at: new Date(),
          updated_at: new Date(),
        }]);
      }
    }
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('units', null, {});
  }
};