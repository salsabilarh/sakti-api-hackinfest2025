'use strict';
const { v4: uuidv4 } = require('uuid');
const argon2 = require('argon2');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Ambil data portfolio
    const portfolios = await queryInterface.sequelize.query(
      `SELECT id, name FROM portfolios`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const portfolioMap = {};
    portfolios.forEach(p => { portfolioMap[p.name] = p.id; });

    // Ambil sub portfolio
    const subPortfolios = await queryInterface.sequelize.query(
      `SELECT id, code FROM sub_portfolios WHERE code IN ('DIG-APP','CLD-SRV','SEC-AUD')`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const getSubPortId = (code) => subPortfolios.find(sp => sp.code === code)?.id;

    // Ambil unit SBU
    const sbuUnits = await queryInterface.sequelize.query(
      `SELECT id FROM units WHERE type='sbu' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const sbuOwnerId = sbuUnits[0]?.id;

    // Ambil user admin untuk created_by
    const adminUser = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email='admin@sucofindo.co.id' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const createdById = adminUser[0]?.id;
    if (!createdById) throw new Error('Admin user not found, run users seeder first');

    await queryInterface.bulkInsert('services', [
      {
        id: uuidv4(),
        name: 'Mobile App Development',
        code: 'DIG-APPA',
        group: 'Application',
        overview: 'Pengembangan aplikasi mobile',
        scope: 'Full cycle',
        benefit: 'Efisiensi bisnis',
        output: 'Aplikasi mobile',
        regulation_ref: 'SNI',
        intro_video_url: null,
        portfolio_id: portfolioMap['Digital Transformation'],
        sub_portfolio_id: getSubPortId('DIG-APP'),
        sbu_owner_id: sbuOwnerId,
        created_by: createdById, // ← diisi dengan ID admin
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Cloud Migration',
        code: 'CLD-SRVA',
        group: 'Infrastructure',
        overview: 'Migrasi ke cloud',
        scope: 'Assessment to execution',
        benefit: 'Skalabilitas',
        output: 'Cloud environment',
        regulation_ref: null,
        intro_video_url: null,
        portfolio_id: portfolioMap['Digital Transformation'],
        sub_portfolio_id: getSubPortId('CLD-SRV'),
        sbu_owner_id: sbuOwnerId,
        created_by: createdById,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Security Audit',
        code: 'SEC-AUDA',
        group: 'Security',
        overview: 'Audit keamanan',
        scope: 'Comprehensive',
        benefit: 'Kepatuhan',
        output: 'Audit report',
        regulation_ref: 'ISO 27001',
        intro_video_url: null,
        portfolio_id: portfolioMap['Cybersecurity'],
        sub_portfolio_id: getSubPortId('SEC-AUD'),
        sbu_owner_id: sbuOwnerId,
        created_by: createdById,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('services', null, {});
  }
};