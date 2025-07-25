'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const units = [
      // Lainnya Units
      { name: 'Satuan Pengawasan Intern (SPI)', type: 'lainnya' },
      { name: 'Strategic Transformation Office (STO)', type: 'lainnya' },

      // Divisi Units
      { name: 'Divisi Human Capital (HC)', type: 'divisi' },
      { name: 'Divisi Informasi dan Solusi Bisnis (ISB)', type: 'divisi' },
      { name: 'Divisi Keuangan dan Akuntansi (KAK)', type: 'divisi' },
      { name: 'Divisi Manajemen Risiko dan Keberlanjutan (MRK)', type: 'divisi' },
      { name: 'Divisi Pengembangan Bisnis Korporat (PBK)', type: 'divisi' },
      { name: 'Divisi Sekretariat Perusahaan (SEKPER)', type: 'divisi' },
      { name: 'Divisi Umum dan Manajemen Aset (UMA)', type: 'divisi' },
      { name: 'Divisi Regional Barat (DIVRE BARAT)', type: 'divisi' },
      { name: 'Divisi Regional Timur (DIVRE TIMUR)', type: 'divisi' },

      // Unit Units
      { name: 'Unit Tanggung Jawab Sosial dan Lingkungan (TJSL)', type: 'unit' },
      { name: 'Unit Kesehatan dan Keselamatan Kerja, dan Lingkungan (K3L)', type: 'unit' },

      // PPK Units
      { name: 'Divisi Pemasaran dan Penjualan Korporat (PPK)', type: 'ppk' },

      // SBU Units
      { name: 'SBU Aset dan Energi Baru dan Terbarukan (AEBT)', type: 'sbu' },
      { name: 'SBU Batubara (BTBR)', type: 'sbu' },
      { name: 'SBU Hulu Migas dan Produk Migas (HMPM)', type: 'sbu' },
      { name: 'SBU Industri (IND)', type: 'sbu' },
      { name: 'SBU Komoditi dan Solusi Perdagangan (KSP)', type: 'sbu' },
      { name: 'SBU Laboratorium (LAB)', type: 'sbu' },
      { name: 'SBU Layanan Publik, Sumber Daya Alam dan Investasi (LSI)', type: 'sbu' },
      { name: 'SBU Mineral (MIN)', type: 'sbu' },
      { name: 'SBU Perdagangan, Industri dan Kelautan (PIK)', type: 'sbu' },
      { name: 'SBU Sertifikasi dan Eco-Framework (SERCO)', type: 'sbu' },
      { name: 'Unit Halal', type: 'sbu' },
      { name: 'Unit Bisnis Teknologi (BISTEK)', type: 'sbu' },

      // Cabang Units
      { name: 'Cabang Bandar Lampung', type: 'cabang' },
      { name: 'Cabang Bandung', type: 'cabang' },
      { name: 'Cabang Batam', type: 'cabang' },
      { name: 'Cabang Bekasi', type: 'cabang' },
      { name: 'Cabang Bengkulu', type: 'cabang' },
      { name: 'Cabang Cilacap', type: 'cabang' },
      { name: 'Cabang Cilegon', type: 'cabang' },
      { name: 'Cabang Cirebon', type: 'cabang' },
      { name: 'Cabang Dumai', type: 'cabang' },
      { name: 'Cabang Jakarta', type: 'cabang' },
      { name: 'Cabang Jambi', type: 'cabang' },
      { name: 'Cabang Medan', type: 'cabang' },
      { name: 'Cabang Padang', type: 'cabang' },
      { name: 'Cabang Palembang', type: 'cabang' },
      { name: 'Cabang Pekanbaru', type: 'cabang' },
      { name: 'Cabang Semarang', type: 'cabang' },
      { name: 'Cabang Balikpapan', type: 'cabang' },
      { name: 'Cabang Banjarmasin', type: 'cabang' },
      { name: 'Cabang Batulicin', type: 'cabang' },
      { name: 'Cabang Bontang', type: 'cabang' },
      { name: 'Cabang Denpasar', type: 'cabang' },
      { name: 'Cabang Kendari', type: 'cabang' },
      { name: 'Cabang Makassar', type: 'cabang' },
      { name: 'Cabang Pontianak', type: 'cabang' },
      { name: 'Cabang Samarinda', type: 'cabang' },
      { name: 'Cabang Sangatta', type: 'cabang' },
      { name: 'Cabang Surabaya', type: 'cabang' },
      { name: 'Cabang Tarakan', type: 'cabang' },
      { name: 'Cabang Timika', type: 'cabang' },
    ];

    const timestamp = new Date();

    await queryInterface.bulkInsert('units', units.map(unit => ({
      id: uuidv4(),
      name: unit.name,
      type: unit.type,
      created_at: timestamp,
      updated_at: timestamp,
    })), {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('units', null, {});
  }
};
