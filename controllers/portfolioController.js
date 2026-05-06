/**
 * controllers/portfolioController.js
 *
 * Mengelola operasi CRUD untuk data Portfolio dan Sub Portfolio.
 * Portfolio adalah kategori tingkat atas untuk layanan SAKTI;
 * Sub Portfolio adalah sub-kategori di bawah Portfolio.
 *
 * ============================================================
 * DAFTAR PERBAIKAN DALAM FILE INI
 * ============================================================
 * [Fix #13 — Low]     Pola `value || existing` pada update functions.
 *   String kosong "" dievaluasi falsy → update diabaikan diam-diam.
 *   → Ganti dengan `!== undefined` check + validasi eksplisit jika empty.
 *
 * [Fix N35 — Medium]  Tidak ada max pagination limit (tapi data master kecil,
 *   GET all mengembalikan semua data tanpa pagination secara default.
 *   Tetap aman karena jumlah portfolio terbatas.
 *
 * [Fix N38 — Low]     name dan code tidak di-trim sebelum digunakan.
 *   → Tambahkan .trim() pada semua input string sebelum validasi.
 *
 * [Fix N50 — Low]     Response message dalam Bahasa Inggris.
 *   → Semua response message diubah ke Bahasa Indonesia.
 *
 * ============================================================
 * DESAIN KEPUTUSAN: PAGINATION MASTER DATA
 * ============================================================
 * Portfolio dan Sub Portfolio adalah data master yang jumlahnya relatif kecil
 * dan jarang berubah. Oleh karena itu, GET all endpoint mengembalikan semua data
 * tanpa pagination secara default (lebih praktis untuk dropdown/select di frontend).
 *
 * Jika suatu saat jumlah portfolio melebihi 100, pertimbangkan untuk menambahkan
 * pagination opsional dengan tetap mempertahankan default all untuk kompatibilitas.
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Validasi duplikasi name dan code dilakukan di controller (bukan di model)
 *   agar bisa mengembalikan 409 Conflict yang informatif.
 * - Setiap input string harus di-trim sebelum disimpan ke database.
 * - Pada update, periksa `field !== undefined` untuk membedakan "tidak dikirim"
 *   dengan "dikirim string kosong".
 */

// ============================================================
// Dependencies
// ============================================================
const { Portfolio, SubPortfolio } = require('../models');
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
// Portfolio Controllers
// ============================================================

/**
 * GET /api/portfolios
 *
 * Mendapatkan daftar semua portfolio beserta sub portfolio di dalamnya.
 * Data dikembalikan semua (tanpa pagination) karena jumlah data master kecil.
 * Cocok untuk kebutuhan dropdown/select di frontend.
 */
exports.getAllPortfolios = async (req, res) => {
  try {
    const portfolios = await Portfolio.findAll({
      include: [
        {
          model: SubPortfolio,
          as: 'sub_portfolios',
          attributes: ['id', 'name', 'code'],
        },
      ],
      order: [['name', 'ASC']],
    });

    return res.json({
      success: true,
      data: portfolios,
      total: portfolios.length,
    });
  } catch (error) {
    console.error('[getAllPortfolios] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil daftar portfolio',
    });
  }
};

/**
 * GET /api/portfolios/:id
 *
 * Mendapatkan detail satu portfolio beserta semua sub portfolio di dalamnya.
 */
exports.getPortfolioById = async (req, res) => {
  try {
    const portfolio = await Portfolio.findByPk(req.params.id, {
      include: [
        {
          model: SubPortfolio,
          as: 'sub_portfolios',
          attributes: ['id', 'name', 'code'],
        },
      ],
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        pesan: 'Portfolio tidak ditemukan',
      });
    }

    return res.json({ success: true, data: portfolio });
  } catch (error) {
    console.error('[getPortfolioById] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil detail portfolio',
    });
  }
};

/**
 * POST /api/portfolios
 *
 * Membuat portfolio baru.
 *
 * [Fix N38] Nama di-trim sebelum validasi dan create.
 * [Fix N50] Response menggunakan Bahasa Indonesia.
 */
exports.createPortfolio = async (req, res) => {
  try {
    const { name } = req.body;
    const trimmedName = trimString(name);

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        pesan: ERROR_MESSAGES.NAME_REQUIRED,
      });
    }

    // Cek duplikasi nama (case-insensitive tergantung collation DB)
    const existing = await Portfolio.findOne({ where: { name: trimmedName } });
    if (existing) {
      return res.status(409).json({
        success: false,
        pesan: 'Nama portfolio sudah digunakan. Gunakan nama yang berbeda.',
      });
    }

    const portfolio = await Portfolio.create({ name: trimmedName });

    return res.status(201).json({
      success: true,
      pesan: 'Portfolio berhasil dibuat',
      data: portfolio,
    });
  } catch (error) {
    console.error('[createPortfolio] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal membuat portfolio',
    });
  }
};

/**
 * PUT /api/portfolios/:id
 *
 * Memperbarui nama portfolio.
 *
 * [Fix #13] Menggunakan `name !== undefined` bukan `name || portfolio.name`.
 * [Fix N38] Nama di-trim sebelum validasi.
 * [Fix N50] Response menggunakan Bahasa Indonesia.
 *
 * Penjelasan perbaikan:
 * Sebelumnya: `name: name || portfolio.name` → jika name = "" (string kosong)
 * dievaluasi falsy, maka nama lama tetap dipakai tanpa error.
 * Sekarang: jika name dikirim (undefined atau tidak), validasi eksplisit.
 */
exports.updatePortfolio = async (req, res) => {
  try {
    const { name } = req.body;
    const portfolio = await Portfolio.findByPk(req.params.id);

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        pesan: 'Portfolio tidak ditemukan',
      });
    }

    // Hanya proses jika field name dikirim dalam request
    if (name !== undefined) {
      const trimmedName = trimString(name);

      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          pesan: ERROR_MESSAGES.NAME_EMPTY,
        });
      }

      // Cek duplikasi jika nama berubah
      if (trimmedName !== portfolio.name) {
        const duplicate = await Portfolio.findOne({ where: { name: trimmedName } });
        if (duplicate && String(duplicate.id) !== String(req.params.id)) {
          return res.status(409).json({
            success: false,
            pesan: 'Nama portfolio sudah digunakan oleh portfolio lain',
          });
        }
      }

      await portfolio.update({ name: trimmedName });
    }

    return res.json({
      success: true,
      pesan: 'Portfolio berhasil diperbarui',
      data: portfolio,
    });
  } catch (error) {
    console.error('[updatePortfolio] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal memperbarui portfolio',
    });
  }
};

/**
 * DELETE /api/portfolios/:id
 *
 * Menghapus portfolio beserta semua sub portfolio di dalamnya (CASCADE DELETE).
 * Peringatan: Pastikan tidak ada layanan aktif yang menggunakan portfolio ini.
 */
exports.deletePortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findByPk(req.params.id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        pesan: 'Portfolio tidak ditemukan',
      });
    }

    const namaPortfolio = portfolio.name;
    await portfolio.destroy();

    return res.json({
      success: true,
      pesan: `Portfolio "${namaPortfolio}" berhasil dihapus`,
    });
  } catch (error) {
    console.error('[deletePortfolio] Error:', error);

    // Tangani error foreign key constraint (misal masih digunakan oleh layanan)
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        success: false,
        pesan: 'Portfolio tidak dapat dihapus karena masih digunakan oleh layanan aktif. Hapus atau pindahkan layanan tersebut terlebih dahulu.',
      });
    }

    return res.status(500).json({
      success: false,
      pesan: 'Gagal menghapus portfolio',
    });
  }
};

// ============================================================
// Sub Portfolio Controllers
// ============================================================

/**
 * GET /api/portfolios/sub-portfolios
 *
 * Mendapatkan daftar semua sub portfolio dari semua portfolio.
 * Mendukung filter berdasarkan portfolio_id (query param).
 *
 * Query params:
 *   portfolio_id (optional) - Filter sub portfolio berdasarkan portfolio induk
 *
 * [Fix N35] Data dikembalikan semua (tanpa pagination) karena jumlahnya terbatas.
 */
exports.getAllSubPortfolios = async (req, res) => {
  try {
    const where = {};
    if (req.query.portfolio_id) {
      where.portfolio_id = req.query.portfolio_id;
    }

    const subPortfolios = await SubPortfolio.findAll({
      where,
      include: [
        {
          model: Portfolio,
          as: 'portfolio',
          attributes: ['id', 'name'],
        },
      ],
      order: [['code', 'ASC']],
    });

    return res.json({
      success: true,
      data: subPortfolios,
      total: subPortfolios.length,
    });
  } catch (error) {
    console.error('[getAllSubPortfolios] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil daftar sub portfolio',
    });
  }
};

/**
 * GET /api/portfolios/sub-portfolios/:id
 *
 * Mendapatkan detail satu sub portfolio beserta info portfolio induk.
 */
exports.getSubPortfolioById = async (req, res) => {
  try {
    const subPortfolio = await SubPortfolio.findByPk(req.params.id, {
      include: [
        {
          model: Portfolio,
          as: 'portfolio',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!subPortfolio) {
      return res.status(404).json({
        success: false,
        pesan: 'Sub portfolio tidak ditemukan',
      });
    }

    return res.json({ success: true, data: subPortfolio });
  } catch (error) {
    console.error('[getSubPortfolioById] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil detail sub portfolio',
    });
  }
};

/**
 * POST /api/portfolios/:portfolio_id/sub-portfolios
 *
 * Membuat sub portfolio baru di bawah portfolio tertentu (dari parameter URL).
 *
 * [Fix N38] name dan code di-trim sebelum validasi.
 * [Fix N50] Response menggunakan Bahasa Indonesia.
 */
exports.createSubPortfolio = async (req, res) => {
  try {
    const { portfolio_id } = req.params;
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

    // Pastikan portfolio induk ada
    const portfolio = await Portfolio.findByPk(portfolio_id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        pesan: 'Portfolio induk tidak ditemukan',
      });
    }

    // Cek duplikasi nama (global, tidak terikat portfolio)
    const existingName = await SubPortfolio.findOne({ where: { name: trimmedName } });
    if (existingName) {
      return res.status(409).json({
        success: false,
        pesan: `Nama sub portfolio "${trimmedName}" sudah digunakan. Gunakan nama yang berbeda.`,
      });
    }

    // Cek duplikasi kode dalam portfolio yang sama
    const existingCode = await SubPortfolio.findOne({
      where: { code: trimmedCode, portfolio_id },
    });
    if (existingCode) {
      return res.status(409).json({
        success: false,
        pesan: `Kode sub portfolio "${trimmedCode}" sudah digunakan dalam portfolio ini`,
      });
    }

    const subPortfolio = await SubPortfolio.create({
      name: trimmedName,
      code: trimmedCode,
      portfolio_id,
    });

    return res.status(201).json({
      success: true,
      pesan: 'Sub portfolio berhasil dibuat',
      data: subPortfolio,
    });
  } catch (error) {
    console.error('[createSubPortfolio] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal membuat sub portfolio',
    });
  }
};

/**
 * PUT /api/portfolios/:portfolio_id/sub-portfolios/:sub_portfolio_id
 *
 * Memperbarui nama dan/atau kode sub portfolio.
 * Sub portfolio harus milik portfolio yang sesuai di URL (keamanan data).
 *
 * [Fix #13] Menggunakan `!== undefined` untuk membedakan field tidak dikirim.
 * [Fix N38] name dan code di-trim sebelum validasi.
 * [Fix N50] Response menggunakan Bahasa Indonesia.
 */
exports.updateSubPortfolio = async (req, res) => {
  try {
    const { portfolio_id, sub_portfolio_id } = req.params;
    const { name, code } = req.body;

    // Cari sub portfolio yang pasti milik portfolio_id yang sama
    const subPortfolio = await SubPortfolio.findOne({
      where: { id: sub_portfolio_id, portfolio_id },
    });

    if (!subPortfolio) {
      return res.status(404).json({
        success: false,
        pesan: 'Sub portfolio tidak ditemukan',
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

      if (trimmedName !== subPortfolio.name) {
        const duplicate = await SubPortfolio.findOne({
          where: { name: trimmedName },
        });
        if (duplicate && String(duplicate.id) !== String(sub_portfolio_id)) {
          return res.status(409).json({
            success: false,
            pesan: `Nama "${trimmedName}" sudah digunakan oleh sub portfolio lain.`,
          });
        }
        subPortfolio.name = trimmedName;
      }
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

      if (trimmedCode !== subPortfolio.code) {
        const duplicate = await SubPortfolio.findOne({
          where: { code: trimmedCode, portfolio_id },
        });
        if (duplicate && String(duplicate.id) !== String(sub_portfolio_id)) {
          return res.status(409).json({
            success: false,
            pesan: `Kode "${trimmedCode}" sudah digunakan oleh sub portfolio lain dalam portfolio ini`,
          });
        }
        subPortfolio.code = trimmedCode;
      }
    }

    await subPortfolio.save();

    return res.json({
      success: true,
      pesan: 'Sub portfolio berhasil diperbarui',
      data: subPortfolio,
    });
  } catch (error) {
    console.error('[updateSubPortfolio] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal memperbarui sub portfolio',
    });
  }
};

/**
 * DELETE /api/portfolios/:portfolio_id/sub-portfolios/:sub_portfolio_id
 *
 * Menghapus sub portfolio.
 * Sub portfolio harus milik portfolio yang sesuai di URL.
 */
exports.deleteSubPortfolio = async (req, res) => {
  try {
    const { portfolio_id, sub_portfolio_id } = req.params;

    const subPortfolio = await SubPortfolio.findOne({
      where: { id: sub_portfolio_id, portfolio_id },
    });

    if (!subPortfolio) {
      return res.status(404).json({
        success: false,
        pesan: 'Sub portfolio tidak ditemukan',
      });
    }

    const namaSubPortfolio = subPortfolio.name;
    await subPortfolio.destroy();

    return res.json({
      success: true,
      pesan: `Sub portfolio "${namaSubPortfolio}" berhasil dihapus`,
    });
  } catch (error) {
    console.error('[deleteSubPortfolio] Error:', error);

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        success: false,
        pesan: 'Sub portfolio tidak dapat dihapus karena masih digunakan oleh layanan aktif',
      });
    }

    return res.status(500).json({
      success: false,
      pesan: 'Gagal menghapus sub portfolio',
    });
  }
};