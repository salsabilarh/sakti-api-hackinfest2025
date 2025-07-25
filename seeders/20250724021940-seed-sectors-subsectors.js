'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const timestamp = new Date();

    const sectorsData = [
      { code: 'A', name: 'Pertanian, Kehutanan, dan Perikanan' },
      { code: 'B', name: 'Pertambangan dan Penggalian' },
      { code: 'C', name: 'Industri Pengolahan' },
      { code: 'D', name: 'Pengadaan Listrik dan Gas' },
      { code: 'E', name: 'Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang' },
      { code: 'F', name: 'Konstruksi' },
      { code: 'G', name: 'Perdagangan Besar dan Eceran; Reparasi Mobil dan Sepeda Motor' },
      { code: 'H', name: 'Transportasi dan Pergudangan' },
      { code: 'I', name: 'Penyediaan Akomodasi dan Makan Minum' },
      { code: 'J', name: 'Informasi dan Komunikasi' },
      { code: 'K', name: 'Jasa Keuangan dan Asuransi' },
      { code: 'L', name: 'Real Estat' },
      { code: 'M', name: 'Jasa Perusahaan' },
      { code: 'N', name: 'Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib' },
      { code: 'O', name: 'Jasa Pendidikan' },
      { code: 'P', name: 'Jasa Kesehatan dan Kegiatan Sosial' },
      { code: 'Q', name: 'Jasa lainnya' },
    ];

    // Tambahkan UUID dan timestamp pada tiap sektor
    const sectorsWithId = sectorsData.map(s => ({
      id: uuidv4(),
      name: s.name,
      code: s.code,
      created_at: timestamp,
      updated_at: timestamp,
    }));

    // Peta untuk refer ke sub sektor nanti
    const sectorCodeToId = {};
    sectorsWithId.forEach(s => {
      sectorCodeToId[s.code] = s.id;
    });

    await queryInterface.bulkInsert('sectors', sectorsWithId);

    const subSectorsData = [
      { code: 'A', name: 'Pertanian, Kehutanan, dan Perikanan', sector_code: 'A' },
      { code: 'B1', name: 'Pertambangan Batubara', sector_code: 'B' },
      { code: 'B2', name: 'Pertambangan Mineral', sector_code: 'B' },
      { code: 'B3', name: 'Pertambangan Minyak Bumi, Gas Alam dan Panas Bumi', sector_code: 'B' },
      { code: 'C', name: 'Industri Pengolahan', sector_code: 'C' },
      { code: 'D', name: 'Pengadaan Listrik dan Gas', sector_code: 'D' },
      { code: 'E', name: 'Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang', sector_code: 'E' },
      { code: 'F', name: 'Konstruksi', sector_code: 'F' },
      { code: 'G', name: 'Perdagangan Besar dan Eceran; Reparasi Mobil dan Sepeda Motor', sector_code: 'G' },
      { code: 'H', name: 'Transportasi dan Pergudangan', sector_code: 'H' },
      { code: 'I', name: 'Penyediaan Akomodasi dan Makan Minum', sector_code: 'I' },
      { code: 'J', name: 'Informasi dan Komunikasi', sector_code: 'J' },
      { code: 'K', name: 'Jasa Keuangan dan Asuransi', sector_code: 'K' },
      { code: 'L', name: 'Real Estat', sector_code: 'L' },
      { code: 'M', name: 'Jasa Perusahaan', sector_code: 'M' },
      { code: 'N', name: 'Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib', sector_code: 'N' },
      { code: 'O', name: 'Jasa Pendidikan', sector_code: 'O' },
      { code: 'P', name: 'Jasa Kesehatan dan Kegiatan Sosial', sector_code: 'P' },
      { code: 'Q', name: 'Jasa lainnya', sector_code: 'Q' },
    ];

    const subSectorsWithId = subSectorsData.map(s => ({
      id: uuidv4(),
      name: s.name,
      code: s.code,
      sector_id: sectorCodeToId[s.sector_code],
      created_at: timestamp,
      updated_at: timestamp,
    }));

    await queryInterface.bulkInsert('sub_sectors', subSectorsWithId);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('sub_sectors', null, {});
    await queryInterface.bulkDelete('sectors', null, {});
  }
};
