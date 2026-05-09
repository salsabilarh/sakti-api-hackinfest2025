'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const uploader = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email='admin@sucofindo.co.id' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const uploaderId = uploader[0]?.id;
    await queryInterface.bulkInsert('marketing_kits', [
      { id: uuidv4(), name: 'Brochure Digital Transformation', file_type: 'Brochure', file_path: 'https://example.com/brochure.pdf', cloudinary_public_id: 'demo/brochure1', uploaded_by: uploaderId, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Whitepaper Cybersecurity', file_type: 'Whitepaper', file_path: 'https://example.com/whitepaper.pdf', cloudinary_public_id: 'demo/whitepaper1', uploaded_by: uploaderId, created_at: new Date(), updated_at: new Date() },
    ]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('marketing_kits', null, {});
  }
};