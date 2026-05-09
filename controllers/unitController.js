/**
 * controllers/unitController.js
 *
 * Mengelola operasi CRUD untuk data Unit Kerja.
 * Unit kerja menentukan hak akses user bersama dengan role
 * (via authorizeAdvanced middleware di setiap route yang membutuhkan).
 *
 * ============================================================
 * DESAIN KEPUTUSAN: AKSES PUBLIK UNTUK GET
 * ============================================================
 * GET /api/units dan GET /api/units/:id sengaja TIDAK memerlukan autentikasi.
 * Ini diperlukan agar halaman registrasi dapat mengisi dropdown unit kerja
 * sebelum user memiliki token JWT.
 *
 * Jika kebutuhan keamanan berubah, tambahkan middleware `authenticate`
 * di unitRoutes.js untuk kedua endpoint tersebut.
 *
 * ============================================================
 * TIPE UNIT (ENUM) — Sumber Kebenaran Tunggal
 * ============================================================
 * UNIT_TYPES diimpor dari models/unit.js untuk menjaga konsistensi antara
 * validasi controller dan ENUM yang terdaftar di database.
 * JANGAN mendefinisikan daftar tipe ini secara lokal di sini.
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Jika tipe unit baru perlu ditambahkan:
 *   1. Tambahkan nilai ke ENUM di migration baru
 *   2. Perbarui UNIT_TYPES di models/unit.js
 *   3. Controller dan validasi otomatis terupdate
 *
 * - FK constraint: Menghapus unit yang masih memiliki user akan ditolak DB
 *   dengan SequelizeForeignKeyConstraintError. Tangani dengan 409 Conflict.
 *
 * - Selalu gunakan trimString() untuk membersihkan input sebelum disimpan.
 * - Pada update, gunakan `!== undefined` untuk membedakan "tidak dikirim"
 *   dengan "dikirim string kosong".
 */

// ============================================================
// Dependencies
// ============================================================
const { Unit } = require('../models');
const { Op } = require('sequelize');
const { parsePagination, ERROR_MESSAGES } = require('../utils/validators');

// ============================================================
// Constants & Helper Functions
// ============================================================

/**
 * Mendapatkan daftar tipe unit yang valid dari model.
 * Fallback jika model belum mengekspor konstanta.
 */
let UNIT_TYPES;
try {
  ({ UNIT_TYPES } = require('../models/unit'));
} catch {
  // Fallback (harus sinkron dengan ENUM di database)
  UNIT_TYPES = ['sbu', 'ppk', 'cabang', 'unit', 'divisi', 'lainnya'];
}

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
// GET Controllers (Publik - Tidak Perlu Autentikasi)
// ============================================================

/**
 * GET /api/units
 *
 * Mendapatkan daftar unit kerja dengan dukungan filter, pencarian, dan pagination.
 * Endpoint ini bersifat publik (digunakan di halaman registrasi).
 *
 * @query {string} [type] - Filter berdasarkan tipe unit (salah satu dari UNIT_TYPES)
 * @query {string} [search] - Kata kunci pencarian (nama unit)
 * @query {number} [page] - Halaman (jika disertakan, aktifkan pagination)
 * @query {number} [limit] - Item per halaman (maks 100)
 */
exports.getAllUnits = async (req, res) => {
  try {
    const where = {};

    // Filter berdasarkan tipe unit
    if (req.query.type) {
      if (!UNIT_TYPES.includes(req.query.type)) {
        return res.status(400).json({
          success: false,
          pesan: `Tipe unit tidak valid. Pilihan: ${UNIT_TYPES.join(', ')}`,
        });
      }
      where.type = req.query.type;
    }

    // Pencarian berdasarkan nama unit
    if (req.query.search) {
      const searchTerm = trimString(req.query.search);
      if (searchTerm) {
        where.name = { [Op.like]: `%${searchTerm}%` };
      }
    }

    const hasPagination = req.query.page || req.query.limit;

    if (hasPagination) {
      // Mode pagination (untuk tampilan tabel yang membutuhkan paginasi)
      const { limit, page, offset } = parsePagination(req.query);
      const { count, rows } = await Unit.findAndCountAll({
        where,
        attributes: ['id', 'name', 'code', 'type'],
        order: [['name', 'ASC']],
        limit,
        offset,
      });

      return res.json({
        success: true,
        data: {
          units: rows,
          pagination: {
            total: count,
            halaman: page,
            limit,
            total_halaman: Math.ceil(count / limit),
          },
        },
      });
    }

    // Tanpa pagination: kembalikan semua data (cocok untuk dropdown)
    const units = await Unit.findAll({
      where,
      attributes: ['id', 'name', 'code', 'type'],
      order: [['name', 'ASC']],
    });

    return res.json({
      success: true,
      data: units,
      total: units.length,
    });
  } catch (error) {
    console.error('[getAllUnits] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil daftar unit kerja',
    });
  }
};

/**
 * GET /api/units/:id
 *
 * Mendapatkan detail satu unit kerja.
 * Endpoint ini bersifat publik.
 */
exports.getUnitById = async (req, res) => {
  try {
    const unit = await Unit.findByPk(req.params.id, {
      attributes: ['id', 'name', 'code', 'type'],
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        pesan: 'Unit kerja tidak ditemukan',
      });
    }

    return res.json({ success: true, data: unit });
  } catch (error) {
    console.error('[getUnitById] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil detail unit kerja',
    });
  }
};

// ============================================================
// Write Controllers (Hanya untuk Admin)
// ============================================================

/**
 * POST /api/units
 *
 * Membuat unit kerja baru. Endpoint ini hanya dapat diakses oleh admin.
 *
 * Menyertakan field `code` yang sebelumnya diabaikan.
 * Melakukan trim pada name dan code sebelum validasi.
 * Response dalam Bahasa Indonesia.
 *
 * @body {string} name - Nama unit (wajib)
 * @body {string} [code] - Kode unit (opsional, harus unik jika diberikan)
 * @body {string} type - Tipe unit (salah satu dari UNIT_TYPES)
 */
exports.createUnit = async (req, res) => {
  try {
    const { name, code, type } = req.body;
    const trimmedName = trimString(name);
    const trimmedCode = trimString(code);

    // Validasi nama
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        pesan: 'Nama unit kerja wajib diisi',
      });
    }

    // Validasi tipe
    if (!type || !UNIT_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        pesan: `Tipe unit wajib dipilih. Pilihan: ${UNIT_TYPES.join(', ')}`,
      });
    }

    // Cek duplikasi nama
    const existingName = await Unit.findOne({ where: { name: trimmedName } });
    if (existingName) {
      return res.status(409).json({
        success: false,
        pesan: 'Nama unit kerja sudah digunakan. Gunakan nama yang berbeda.',
      });
    }

    // Cek duplikasi kode (jika diberikan)
    if (trimmedCode) {
      const existingCode = await Unit.findOne({ where: { code: trimmedCode } });
      if (existingCode) {
        return res.status(409).json({
          success: false,
          pesan: `Kode unit "${trimmedCode}" sudah digunakan. Gunakan kode yang berbeda.`,
        });
      }
    }

    // Sertakan code dalam create
    const unit = await Unit.create({
      name: trimmedName,
      code: trimmedCode || null,
      type,
    });

    return res.status(201).json({
      success: true,
      pesan: 'Unit kerja berhasil dibuat',
      data: unit,
    });
  } catch (error) {
    console.error('[createUnit] Error:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        pesan: 'Nama atau kode unit kerja sudah digunakan',
      });
    }

    return res.status(500).json({
      success: false,
      pesan: 'Gagal membuat unit kerja',
    });
  }
};

/**
 * PUT /api/units/:id
 *
 * Memperbarui data unit kerja secara parsial (hanya field yang dikirim).
 * Endpoint ini hanya untuk admin.
 *
 * Menggunakan `!== undefined` untuk membedakan field tidak dikirim.
 * Melakukan trim sebelum validasi.
 *
 * @body {string} [name] - Nama unit baru
 * @body {string} [code] - Kode unit baru (boleh kosong untuk menghapus kode)
 * @body {string} [type] - Tipe unit baru
 */
exports.updateUnit = async (req, res) => {
  try {
    const { name, code, type } = req.body;
    const unit = await Unit.findByPk(req.params.id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        pesan: 'Unit kerja tidak ditemukan',
      });
    }

    // Update name jika dikirim
    if (name !== undefined) {
      const trimmedName = trimString(name);
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          pesan: 'Nama unit kerja tidak boleh kosong',
        });
      }
      if (trimmedName !== unit.name) {
        const duplicate = await Unit.findOne({ where: { name: trimmedName } });
        if (duplicate && String(duplicate.id) !== String(req.params.id)) {
          return res.status(409).json({
            success: false,
            pesan: 'Nama unit kerja sudah digunakan oleh unit lain',
          });
        }
      }
      unit.name = trimmedName;
    }

    // Update code jika dikirim (boleh kosong -> set null)
    if (code !== undefined) {
      const trimmedCode = trimString(code);
      if (trimmedCode) {
        if (trimmedCode !== unit.code) {
          const duplicate = await Unit.findOne({ where: { code: trimmedCode } });
          if (duplicate && String(duplicate.id) !== String(req.params.id)) {
            return res.status(409).json({
              success: false,
              pesan: `Kode "${trimmedCode}" sudah digunakan oleh unit lain`,
            });
          }
        }
        unit.code = trimmedCode;
      } else {
        // code dikirim sebagai "" atau null -> hapus kode
        unit.code = null;
      }
    }

    // Update type jika dikirim
    if (type !== undefined) {
      if (!type || !UNIT_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          pesan: `Tipe unit tidak valid. Pilihan: ${UNIT_TYPES.join(', ')}`,
        });
      }
      unit.type = type;
    }

    await unit.save();

    return res.json({
      success: true,
      pesan: 'Unit kerja berhasil diperbarui',
      data: unit,
    });
  } catch (error) {
    console.error('[updateUnit] Error:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        pesan: 'Nama atau kode unit kerja sudah digunakan',
      });
    }

    return res.status(500).json({
      success: false,
      pesan: 'Gagal memperbarui unit kerja',
    });
  }
};

/**
 * DELETE /api/units/:id
 *
 * Menghapus unit kerja secara permanen (hard delete). Hanya untuk admin.
 *
 * Peringatan: Unit yang masih memiliki pengguna aktif tidak dapat dihapus
 * karena foreign key constraint (ON DELETE RESTRICT). Pastikan tidak ada
 * pengguna yang terkait sebelum menghapus.
 */
exports.deleteUnit = async (req, res) => {
  try {
    const unit = await Unit.findByPk(req.params.id);
    if (!unit) {
      return res.status(404).json({
        success: false,
        pesan: 'Unit kerja tidak ditemukan',
      });
    }

    const namaUnit = unit.name;
    await unit.destroy();

    return res.json({
      success: true,
      pesan: `Unit kerja "${namaUnit}" berhasil dihapus`,
    });
  } catch (error) {
    console.error('[deleteUnit] Error:', error);

    // Tangani foreign key violation (masih ada user di unit ini)
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        success: false,
        pesan: `Unit kerja tidak dapat dihapus karena masih memiliki pengguna aktif. ` +
               'Pindahkan atau nonaktifkan semua pengguna di unit ini terlebih dahulu.',
      });
    }

    return res.status(500).json({
      success: false,
      pesan: 'Gagal menghapus unit kerja',
    });
  }
};