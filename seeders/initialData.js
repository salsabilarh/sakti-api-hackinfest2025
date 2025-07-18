'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Seed unit kerja
    const units = await queryInterface.bulkInsert('units', [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'SBU',
        code: 'SBU',
        type: 'sbu',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'PPK',
        code: 'PPK',
        type: 'ppk',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Cabang Balikpapan',
        code: 'CBP',
        type: 'cabang',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Cabang Surabaya',
        code: 'SBY',
        type: 'cabang',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'Cabang Jakarta',
        code: 'JKT',
        type: 'cabang',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], { returning: true });

    // Seed akun admin
    const argon2 = require('argon2');
    const adminPassword = await argon2.hash('Admin123!');
    
    await queryInterface.bulkInsert('users', [
      {
        id: '110e8400-e29b-41d4-a716-446655440000',
        full_name: 'Admin Sistem',
        email: 'admin@example.com',
        password: adminPassword,
        role: 'admin',
        unit_kerja_id: '550e8400-e29b-41d4-a716-446655440000', // SBU
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Seed portfolio
    const portfolios = await queryInterface.bulkInsert('portfolios', [
      {
        id: '330e8400-e29b-41d4-a716-446655440000',
        name: 'Engineering',
        code: 'ENG',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '330e8400-e29b-41d4-a716-446655440001',
        name: 'Consulting',
        code: 'CON',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '330e8400-e29b-41d4-a716-446655440002',
        name: 'Testing',
        code: 'TST',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], { returning: true });

    // Seed sub portfolio
    await queryInterface.bulkInsert('sub_portfolios', [
      {
        id: '440e8400-e29b-41d4-a716-446655440000',
        name: 'Engineering Design',
        code: 'ENG-1',
        portfolio_id: '330e8400-e29b-41d4-a716-446655440000',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '440e8400-e29b-41d4-a716-446655440001',
        name: 'Engineering Construction',
        code: 'ENG-2',
        portfolio_id: '330e8400-e29b-41d4-a716-446655440000',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '440e8400-e29b-41d4-a716-446655440002',
        name: 'Management Consulting',
        code: 'CON-1',
        portfolio_id: '330e8400-e29b-41d4-a716-446655440001',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '440e8400-e29b-41d4-a716-446655440003',
        name: 'Technical Consulting',
        code: 'CON-2',
        portfolio_id: '330e8400-e29b-41d4-a716-446655440001',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Seed sektor
    const sectors = await queryInterface.bulkInsert('sectors', [
      {
        id: '660e8400-e29b-41d4-a716-446655440000',
        name: 'Oil & Gas',
        code: 'OG',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        name: 'Mining',
        code: 'MN',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440002',
        name: 'Manufacturing',
        code: 'MF',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Seed sub sektor
    await queryInterface.bulkInsert('sub_sectors', [
      {
        id: '770e8400-e29b-41d4-a716-446655440000',
        name: 'Upstream Oil & Gas',
        code: 'OG-1',
        sector_id: '660e8400-e29b-41d4-a716-446655440000',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440001',
        name: 'Downstream Oil & Gas',
        code: 'OG-2',
        sector_id: '660e8400-e29b-41d4-a716-446655440000',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440002',
        name: 'Coal Mining',
        code: 'MN-1',
        sector_id: '660e8400-e29b-41d4-a716-446655440001',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440003',
        name: 'Mineral Mining',
        code: 'MN-2',
        sector_id: '660e8400-e29b-41d4-a716-446655440001',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Seed contoh jasa
    await queryInterface.bulkInsert('services', [
      {
        id: '880e8400-e29b-41d4-a716-446655440000',
        name: 'Engineering Design for Oil Refinery',
        code: 'ENG-1A',
        group: 'Design',
        overview: 'Comprehensive engineering design services for oil refinery projects',
        scope: 'Basic and detailed engineering design',
        benefit: 'Optimized design, cost efficiency',
        output: 'Engineering drawings, specifications',
        regulation_ref: 'API, ASME standards',
        portfolio_id: '330e8400-e29b-41d4-a716-446655440000',
        sub_portfolio_id: '440e8400-e29b-41d4-a716-446655440000',
        sbu_owner_id: '550e8400-e29b-41d4-a716-446655440000',
        created_by: '110e8400-e29b-41d4-a716-446655440000',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '880e8400-e29b-41d4-a716-446655440001',
        name: 'Mine Planning Consulting',
        code: 'CON-1A',
        group: 'Consulting',
        overview: 'Strategic mine planning and optimization services',
        scope: 'Mine design, scheduling, equipment selection',
        benefit: 'Increased productivity, reduced costs',
        output: 'Mine plan reports, optimization models',
        regulation_ref: 'Mining regulations',
        portfolio_id: '330e8400-e29b-41d4-a716-446655440001',
        sub_portfolio_id: '440e8400-e29b-41d4-a716-446655440002',
        sbu_owner_id: '550e8400-e29b-41d4-a716-446655440001',
        created_by: '110e8400-e29b-41d4-a716-446655440000',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Seed relasi service dengan sector
    await queryInterface.bulkInsert('service_sectors', [
      {
        service_id: '880e8400-e29b-41d4-a716-446655440000',
        sector_id: '660e8400-e29b-41d4-a716-446655440000',
        created_at: new Date()
      },
      {
        service_id: '880e8400-e29b-41d4-a716-446655440001',
        sector_id: '660e8400-e29b-41d4-a716-446655440001',
        created_at: new Date()
      }
    ]);

    // Seed relasi service dengan sub sector
    await queryInterface.bulkInsert('service_sub_sectors', [
      {
        service_id: '880e8400-e29b-41d4-a716-446655440000',
        sub_sector_id: '770e8400-e29b-41d4-a716-446655440001',
        created_at: new Date()
      },
      {
        service_id: '880e8400-e29b-41d4-a716-446655440001',
        sub_sector_id: '770e8400-e29b-41d4-a716-446655440002',
        created_at: new Date()
      }
    ]);

    // Seed contoh marketing kit
    await queryInterface.bulkInsert('marketing_kits', [
      {
        id: '990e8400-e29b-41d4-a716-446655440000',
        name: 'Oil Refinery Design Brochure.pdf',
        file_path: 'oil-refinery-design-brochure-123456.pdf',
        file_type: 'flyer',
        service_id: '880e8400-e29b-41d4-a716-446655440000',
        uploaded_by: '110e8400-e29b-41d4-a716-446655440000',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '990e8400-e29b-41d4-a716-446655440001',
        name: 'Mine Planning Presentation.pptx',
        file_path: 'mine-planning-presentation-123456.pptx',
        file_type: 'pitch_deck',
        service_id: '880e8400-e29b-41d4-a716-446655440001',
        uploaded_by: '110e8400-e29b-41d4-a716-446655440000',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    // Hapus semua data yang di-seed
    await queryInterface.bulkDelete('marketing_kits', null, {});
    await queryInterface.bulkDelete('service_sub_sectors', null, {});
    await queryInterface.bulkDelete('service_sectors', null, {});
    await queryInterface.bulkDelete('services', null, {});
    await queryInterface.bulkDelete('sub_sectors', null, {});
    await queryInterface.bulkDelete('sectors', null, {});
    await queryInterface.bulkDelete('sub_portfolios', null, {});
    await queryInterface.bulkDelete('portfolios', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('units', null, {});
  }
};