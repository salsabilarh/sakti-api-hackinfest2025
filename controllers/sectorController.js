/**
 * controllers/sectorController.js
 *
 * Mengelola operasi CRUD untuk data Sektor dan Sub Sektor.
 * Sektor merepresentasikan bidang industri/pasar yang dilayani;
 * Sub Sektor adalah spesialisasi lebih dalam di bawah sektor.
 *
 * ============================================================
 * DAFTAR PERBAIKAN DALAM FILE INI
 * ============================================================
 * [Fix #13 — Low]     Pola `value || existing` pada update functions.
 *   → Ganti dengan `!== undefined` check + validasi eksplisit.
 *
 * [Fix N35 — Medium]  Tidak ada max pagination limit (data master kecil,
 *   tetap aman. GET all mengembalikan semua data untuk kebutuhan dropdown.
 *
 * [Fix N38 — Low]     name dan code tidak di-trim sebelum digunakan.
 *   → Tambahkan .trim() pada semua input string.
 *
 * [Fix N50 — Low]     Response message dalam Bahasa Inggris.
 *   → Semua response message diubah ke Bahasa Indonesia.
 *
 * ============================================================
 * DESAIN KEPUTUSAN
 * ============================================================
 * Sektor dan Sub Sektor adalah data master (master data) yang jumlahnya
 * relatif kecil. GET all mengembalikan semua data tanpa pagination default
 * agar mudah digunakan untuk dropdown/filter di frontend.
 *
 * Jika data tumbuh signifikan (>50), aktifkan pagination wajib dengan
 * mengubah ke findAndCountAll() + parsePagination().
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Validasi duplikasi kode dilakukan pada level sektor yang sama (bukan global)
 *   karena kode seperti 'A1' bisa valid di sektor berbeda.
 * - Selalu gunakan trimString() untuk membersihkan input sebelum disimpan.
 * - Pada update, periksa `field !== undefined` untuk membedakan "tidak dikirim"
 *   dengan "dikirim string kosong".
 */

// ============================================================
// Dependencies
// ============================================================
const { Sector, SubSector } = require('../models');
const { Op } = require('sequelize');
const { ERROR_MESSAGES } = require('../utils/validators');

// ============================================================
// Helper Functions (Private)
// ============================================================

/**
 * Memeriksa apakah string tidak kosong setelah di-trim.
 *
 * @param {any} value - Nilai yang akan diperiksa
 * @returns {boolean}
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Mendapatkan string yang sudah di-trim, atau string kosong jika bukan string.
 *
 * @param {any} value - Nilai input
 * @returns {string}
 */
function trimString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// ============================================================
// Sektor Controllers
// ============================================================

/**
 * GET /api/sectors
 *
 * Mendapatkan daftar semua sektor beserta sub sektor di dalamnya.
 * Mendukung filter pencarian berdasarkan nama sektor (query param 'search').
 *
 * @query {string} [search] - Kata kunci pencarian nama sektor (opsional)
 */
exports.getAllSectors = async (req, res) => {
  try {
    const where = {};
    if (req.query.search) {
      const searchTerm = trimString(req.query.search);
      if (searchTerm) {
        where.name = { [Op.like]: `%${searchTerm}%` };
      }
    }

    const sectors = await Sector.findAll({
      where,
      include: [
        {
          model: SubSector,
          as: 'sub_sectors',
          attributes: ['id', 'name', 'code'],
        },
      ],
      order: [['name', 'ASC']],
    });

    return res.json({
      success: true,
      data: sectors,
      total: sectors.length,
    });
  } catch (error) {
    console.error('[getAllSectors] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil daftar sektor',
    });
  }
};

/**
 * GET /api/sectors/:id
 *
 * Mendapatkan detail satu sektor beserta semua sub sektor di dalamnya.
 */
exports.getSectorById = async (req, res) => {
  try {
    const sector = await Sector.findByPk(req.params.id, {
      include: [
        {
          model: SubSector,
          as: 'sub_sectors',
          attributes: ['id', 'name', 'code'],
        },
      ],
    });

    if (!sector) {
      return res.status(404).json({
        success: false,
        pesan: 'Sektor tidak ditemukan',
      });
    }

    return res.json({ success: true, data: sector });
  } catch (error) {
    console.error('[getSectorById] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil detail sektor',
    });
  }
};

/**
 * POST /api/sectors
 *
 * Membuat sektor baru.
 *
 * [Fix N38] Nama dan kode di-trim sebelum validasi.
 * [Fix N50] Response menggunakan Bahasa Indonesia.
 */
exports.createSector = async (req, res) => {
  try {
    const { name, code } = req.body;
    const trimmedName = trimString(name);
    const trimmedCode = trimString(code);

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        pesan: ERROR_MESSAGES.NAME_REQUIRED,
      });
    }
    if (!trimmedCode) {
      return res.status(400).json({
        success: false,
        pesan: ERROR_MESSAGES.CODE_REQUIRED,
      });
    }

    // Cek duplikasi kode (kode sektor harus unik global)
    const existingCode = await Sector.findOne({ where: { code: trimmedCode } });
    if (existingCode) {
      return res.status(409).json({
        success: false,
        pesan: `Kode sektor "${trimmedCode}" sudah digunakan. Gunakan kode yang berbeda.`,
      });
    }

    const sector = await Sector.create({
      name: trimmedName,
      code: trimmedCode,
    });

    return res.status(201).json({
      success: true,
      pesan: 'Sektor berhasil dibuat',
      data: sector,
    });
  } catch (error) {
    console.error('[createSector] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal membuat sektor',
    });
  }
};

/**
 * PUT /api/sectors/:id
 *
 * Memperbarui data sektor (nama dan/atau kode).
 *
 * [Fix #13] Menggunakan `name !== undefined` bukan `name || sector.name`.
 * [Fix N38] Nama dan kode di-trim sebelum validasi.
 * [Fix N50] Response menggunakan Bahasa Indonesia.
 *
 * Penjelasan perbaikan:
 * Sebelumnya: `name: name || sector.name` → jika name = "" (string kosong)
 * dievaluasi falsy, maka nama lama tetap dipakai tanpa error.
 * Sekarang: jika name dikirim, validasi eksplisit; jika kosong → error 400.
 */
exports.updateSector = async (req, res) => {
  try {
    const { name, code } = req.body;
    const sector = await Sector.findByPk(req.params.id);

    if (!sector) {
      return res.status(404).json({
        success: false,
        pesan: 'Sektor tidak ditemukan',
      });
    }

    // Proses update name jika dikirim
    if (name !== undefined) {
      const trimmedName = trimString(name);
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          pesan: ERROR_MESSAGES.NAME_EMPTY,
        });
      }
      sector.name = trimmedName;
    }

    // Proses update code jika dikirim
    if (code !== undefined) {
      const trimmedCode = trimString(code);
      if (!trimmedCode) {
        return res.status(400).json({
          success: false,
          pesan: ERROR_MESSAGES.CODE_EMPTY,
        });
      }

      // Cek duplikasi kode jika berubah
      if (trimmedCode !== sector.code) {
        const duplicate = await Sector.findOne({ where: { code: trimmedCode } });
        if (duplicate && String(duplicate.id) !== String(req.params.id)) {
          return res.status(409).json({
            success: false,
            pesan: `Kode sektor "${trimmedCode}" sudah digunakan oleh sektor lain`,
          });
        }
        sector.code = trimmedCode;
      }
    }

    await sector.save();

    return res.json({
      success: true,
      pesan: 'Sektor berhasil diperbarui',
      data: sector,
    });
  } catch (error) {
    console.error('[updateSector] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal memperbarui sektor',
    });
  }
};

/**
 * DELETE /api/sectors/:id
 *
 * Menghapus sektor beserta semua sub sektor di dalamnya (CASCADE DELETE).
 * Peringatan: Pastikan tidak ada layanan yang masih menggunakan sektor ini.
 */
exports.deleteSector = async (req, res) => {
  try {
    const sector = await Sector.findByPk(req.params.id);
    if (!sector) {
      return res.status(404).json({
        success: false,
        pesan: 'Sektor tidak ditemukan',
      });
    }

    const namaSektor = sector.name;
    await sector.destroy();

    return res.json({
      success: true,
      pesan: `Sektor "${namaSektor}" berhasil dihapus`,
    });
  } catch (error) {
    console.error('[deleteSector] Error:', error);

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        success: false,
        pesan: 'Sektor tidak dapat dihapus karena masih digunakan oleh layanan aktif',
      });
    }

    return res.status(500).json({
      success: false,
      pesan: 'Gagal menghapus sektor',
    });
  }
};

// ============================================================
// Sub Sektor Controllers
// ============================================================

/**
 * POST /api/sectors/:sector_id/sub-sectors
 *
 * Membuat sub sektor baru di bawah sektor tertentu.
 *
 * [Fix N38] Nama dan kode di-trim sebelum validasi.
 * [Fix N50] Response menggunakan Bahasa Indonesia.
 */
exports.createSubSector = async (req, res) => {
  try {
    const { sector_id } = req.params;
    const { name, code } = req.body;

    const trimmedName = trimString(name);
    const trimmedCode = trimString(code);

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        pesan: ERROR_MESSAGES.NAME_REQUIRED,
      });
    }
    if (!trimmedCode) {
      return res.status(400).json({
        success: false,
        pesan: ERROR_MESSAGES.CODE_REQUIRED,
      });
    }

    // Pastikan sektor induk ada
    const sector = await Sector.findByPk(sector_id);
    if (!sector) {
      return res.status(404).json({
        success: false,
        pesan: 'Sektor induk tidak ditemukan',
      });
    }

    // Cek duplikasi kode dalam sektor yang sama (kode boleh sama antar sektor)
    const existingCode = await SubSector.findOne({
      where: { code: trimmedCode, sector_id },
    });
    if (existingCode) {
      return res.status(409).json({
        success: false,
        pesan: `Kode sub sektor "${trimmedCode}" sudah digunakan dalam sektor ini`,
      });
    }

    const subSector = await SubSector.create({
      name: trimmedName,
      code: trimmedCode,
      sector_id,
    });

    return res.status(201).json({
      success: true,
      pesan: 'Sub sektor berhasil dibuat',
      data: subSector,
    });
  } catch (error) {
    console.error('[createSubSector] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal membuat sub sektor',
    });
  }
};

/**
 * PUT /api/sectors/:sector_id/sub-sectors/:sub_sector_id
 *
 * Memperbarui data sub sektor (nama dan/atau kode).
 * Sub sektor harus milik sektor yang sesuai di URL (keamanan data).
 *
 * [Fix #13] Menggunakan `!== undefined` untuk membedakan field tidak dikirim.
 * [Fix N38] Nama dan kode di-trim sebelum validasi.
 * [Fix N50] Response menggunakan Bahasa Indonesia.
 */
exports.updateSubSector = async (req, res) => {
  try {
    const { sector_id, sub_sector_id } = req.params;
    const { name, code } = req.body;

    // Pastikan sub sektor ditemukan DAN milik sektor yang sama
    const subSector = await SubSector.findOne({
      where: { id: sub_sector_id, sector_id },
    });

    if (!subSector) {
      return res.status(404).json({
        success: false,
        pesan: 'Sub sektor tidak ditemukan',
      });
    }

    // Proses update name jika dikirim
    if (name !== undefined) {
      const trimmedName = trimString(name);
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          pesan: ERROR_MESSAGES.NAME_EMPTY,
        });
      }
      subSector.name = trimmedName;
    }

    // Proses update code jika dikirim
    if (code !== undefined) {
      const trimmedCode = trimString(code);
      if (!trimmedCode) {
        return res.status(400).json({
          success: false,
          pesan: ERROR_MESSAGES.CODE_EMPTY,
        });
      }

      // Cek duplikasi dalam sektor yang sama
      if (trimmedCode !== subSector.code) {
        const duplicate = await SubSector.findOne({
          where: { code: trimmedCode, sector_id },
        });
        if (duplicate && String(duplicate.id) !== String(sub_sector_id)) {
          return res.status(409).json({
            success: false,
            pesan: `Kode "${trimmedCode}" sudah digunakan oleh sub sektor lain dalam sektor ini`,
          });
        }
        subSector.code = trimmedCode;
      }
    }

    await subSector.save();

    return res.json({
      success: true,
      pesan: 'Sub sektor berhasil diperbarui',
      data: subSector,
    });
  } catch (error) {
    console.error('[updateSubSector] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal memperbarui sub sektor',
    });
  }
};

/**
 * DELETE /api/sectors/:sector_id/sub-sectors/:sub_sector_id
 *
 * Menghapus sub sektor.
 * Sub sektor harus milik sektor yang sesuai di URL.
 */
exports.deleteSubSector = async (req, res) => {
  try {
    const { sector_id, sub_sector_id } = req.params;

    const subSector = await SubSector.findOne({
      where: { id: sub_sector_id, sector_id },
    });

    if (!subSector) {
      return res.status(404).json({
        success: false,
        pesan: 'Sub sektor tidak ditemukan',
      });
    }

    const namaSubSektor = subSector.name;
    await subSector.destroy();

    return res.json({
      success: true,
      pesan: `Sub sektor "${namaSubSektor}" berhasil dihapus`,
    });
  } catch (error) {
    console.error('[deleteSubSector] Error:', error);

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        success: false,
        pesan: 'Sub sektor tidak dapat dihapus karena masih digunakan oleh layanan aktif',
      });
    }

    return res.status(500).json({
      success: false,
      pesan: 'Gagal menghapus sub sektor',
    });
  }
};