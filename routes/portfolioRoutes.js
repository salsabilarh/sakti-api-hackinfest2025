/**
 * routes/portfolioRoutes.js
 *
 * Route untuk mengelola data Portfolio dan Sub Portfolio.
 * Base path: /api/portfolios
 *
 * ============================================================
 * PERBAIKAN DALAM FILE INI
 * ============================================================
 * [BUG #15 — KRITIS] Urutan route yang salah menyebabkan GET /sub-portfolios
 *   selalu ditangani oleh GET /:id (karena Express mengevaluasi secara berurutan).
 *   Akibatnya: /api/portfolios/sub-portfolios mengembalikan 404.
 *   SOLUSI: Semua route statis (path literal) harus didefinisikan SEBELUM
 *   route dinamis (/:id). Ini adalah aturan fundamental Express routing.
 *
 * ============================================================
 * STRUKTUR OTORISASI
 * ============================================================
 * - READ (GET) : Semua user terautentikasi (auth.authenticate)
 * - WRITE (POST, PUT, DELETE) : Hanya admin dan management SBU/PPK
 *   (menggunakan middleware managementAccess)
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Jangan pernah menempatkan route statis setelah route dengan parameter
 *   dinamis (/:id) karena akan menyebabkan route statis tidak dapat diakses.
 * - Jika menambah route baru dengan path literal (seperti /export, /bulk),
 *   letakkan di atas route /:id.
 * - Management access dapat disesuaikan dengan mengubah array roles atau allowUnits.
 */

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/portfolioController');
const auth = require('../middlewares/authMiddleware');

// =============================================================================
// Middleware untuk write operations (admin & management SBU/PPK)
// =============================================================================
const managementAccess = auth.authorizeAdvanced({
  roles: ['admin', 'management'],
  allowUnits: ['sbu', 'ppk'],
});

// =============================================================================
// PERHATIAN: Route statis (path literal) HARUS sebelum route dinamis (/:id)
// =============================================================================

// -----------------------------------------------------------------------------
// SUB PORTFOLIO ROUTES (STATIS) - Tidak mengandung parameter dinamis
// -----------------------------------------------------------------------------

/**
 * GET /api/portfolios/sub-portfolios
 *
 * Mendapatkan daftar semua sub portfolio dari semua portfolio.
 * Mendukung filter opsional: ?portfolio_id=... (query param)
 *
 * @access Semua user terautentikasi
 */
router.get('/sub-portfolios', auth.authenticate, ctrl.getAllSubPortfolios);

/**
 * GET /api/portfolios/sub-portfolios/:id
 *
 * Mendapatkan detail satu sub portfolio berdasarkan ID.
 *
 * @access Semua user terautentikasi
 */
router.get('/sub-portfolios/:id', auth.authenticate, ctrl.getSubPortfolioById);

// -----------------------------------------------------------------------------
// PORTFOLIO ROUTES (DINAMIS) - Mengandung parameter :id
// -----------------------------------------------------------------------------

/**
 * GET /api/portfolios
 *
 * Mendapatkan daftar semua portfolio beserta sub portfolio di dalamnya.
 * Data dikembalikan tanpa pagination (cocok untuk dropdown).
 *
 * @access Semua user terautentikasi
 */
router.get('/', auth.authenticate, ctrl.getAllPortfolios);

/**
 * GET /api/portfolios/:id
 *
 * Mendapatkan detail satu portfolio beserta semua sub portfolio-nya.
 *
 * @access Semua user terautentikasi
 */
router.get('/:id', auth.authenticate, ctrl.getPortfolioById);

/**
 * POST /api/portfolios
 *
 * Membuat portfolio baru.
 *
 * @body {string} name - Nama portfolio (wajib, unik)
 * @access Admin dan management SBU/PPK
 */
router.post('/', auth.authenticate, managementAccess, ctrl.createPortfolio);

/**
 * PUT /api/portfolios/:id
 *
 * Memperbarui nama portfolio.
 *
 * @body {string} name - Nama baru portfolio (opsional, jika dikirim)
 * @access Admin dan management SBU/PPK
 */
router.put('/:id', auth.authenticate, managementAccess, ctrl.updatePortfolio);

/**
 * DELETE /api/portfolios/:id
 *
 * Menghapus portfolio beserta semua sub portfolio di dalamnya (CASCADE).
 * Peringatan: Portfolio yang memiliki layanan aktif tidak dapat dihapus.
 *
 * @access Admin dan management SBU/PPK
 */
router.delete('/:id', auth.authenticate, managementAccess, ctrl.deletePortfolio);

// -----------------------------------------------------------------------------
// SUB PORTFOLIO ROUTES (BERSARANG DI BAWAH PORTFOLIO TERTENTU)
// -----------------------------------------------------------------------------

/**
 * POST /api/portfolios/:portfolio_id/sub-portfolios
 *
 * Membuat sub portfolio baru di bawah portfolio tertentu.
 *
 * @param {string} portfolio_id - ID portfolio induk (dari URL)
 * @body {string} name - Nama sub portfolio (wajib, unik)
 * @body {string} code - Kode sub portfolio (wajib, unik dalam satu portfolio)
 * @access Admin dan management SBU/PPK
 */
router.post(
  '/:portfolio_id/sub-portfolios',
  auth.authenticate,
  managementAccess,
  ctrl.createSubPortfolio
);

/**
 * PUT /api/portfolios/:portfolio_id/sub-portfolios/:sub_portfolio_id
 *
 * Memperbarui nama dan/atau kode sub portfolio.
 * Sub portfolio harus milik portfolio_id yang sesuai di URL.
 *
 * @param {string} portfolio_id - ID portfolio induk
 * @param {string} sub_portfolio_id - ID sub portfolio yang akan diupdate
 * @body {string} [name] - Nama baru (opsional)
 * @body {string} [code] - Kode baru (opsional)
 * @access Admin dan management SBU/PPK
 */
router.put(
  '/:portfolio_id/sub-portfolios/:sub_portfolio_id',
  auth.authenticate,
  managementAccess,
  ctrl.updateSubPortfolio
);

/**
 * DELETE /api/portfolios/:portfolio_id/sub-portfolios/:sub_portfolio_id
 *
 * Menghapus sub portfolio secara permanen.
 * Sub portfolio harus milik portfolio_id yang sesuai di URL.
 *
 * @param {string} portfolio_id - ID portfolio induk
 * @param {string} sub_portfolio_id - ID sub portfolio yang akan dihapus
 * @access Admin dan management SBU/PPK
 */
router.delete(
  '/:portfolio_id/sub-portfolios/:sub_portfolio_id',
  auth.authenticate,
  managementAccess,
  ctrl.deleteSubPortfolio
);

// =============================================================================
// Ekspor Router
// =============================================================================
module.exports = router;