/**
 * routes/serviceRoutes.js
 *
 * Route untuk mengelola data Layanan (Service) beserta relasinya.
 * Base path: /api/services
 *
 * ============================================================
 * STRUKTUR OTORISASI
 * ============================================================
 * - READ (GET) : Semua user terautentikasi (auth.authenticate)
 * - WRITE (POST, PUT, revenue) : Admin dan management SBU/PPK
 *   (menggunakan managementAccess)
 * - DELETE : Hanya admin (auth.authorize('admin')) karena bersifat permanen
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - managementAccess membatasi akses write untuk role 'management'
 *   hanya jika unit kerja bertipe 'sbu' atau 'ppk'. Admin bebas.
 * - Endpoint DELETE sengaja lebih ketat karena menghapus layanan
 *   akan menghapus juga relasi (marketing kit, revenue, dll) via CASCADE.
 * - Jika menambah endpoint baru, perhatikan urutan route statis vs dinamis.
 */

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/serviceController');
const auth = require('../middlewares/authMiddleware');

// =============================================================================
// Middleware untuk write operations (admin & management SBU/PPK)
// =============================================================================
const managementAccess = auth.authorizeAdvanced({
  roles: ['admin', 'management'],
  allowUnits: ['sbu', 'ppk'],
});

// =============================================================================
// READ ROUTES (Semua user terautentikasi)
// =============================================================================

/**
 * GET /api/services
 *
 * Mendapatkan daftar layanan dengan dukungan:
 * - Pencarian (search) by name/code
 * - Filter berdasarkan portfolio dan sektor
 * - Sorting (name, portfolio, sector)
 * - Pagination (dengan batas maksimum 100 item per halaman)
 *
 * @access Semua user terautentikasi
 */
router.get('/', auth.authenticate, ctrl.getAllServices);

/**
 * GET /api/services/:id
 *
 * Mendapatkan detail lengkap satu layanan termasuk:
 * - Portfolio & Sub Portfolio
 * - Sektor & Sub Sektor
 * - Marketing Kit terkait
 * - Data Revenue (pendapatan)
 *
 * @access Semua user terautentikasi
 */
router.get('/:id', auth.authenticate, ctrl.getServiceById);

// =============================================================================
// WRITE ROUTES (Admin dan management SBU/PPK)
// =============================================================================

/**
 * POST /api/services
 *
 * Membuat layanan baru dengan relasi sektor dan sub sektor.
 * Operasi dibungkus dalam database transaction.
 *
 * @body {string} name - Nama layanan (wajib)
 * @body {string} [group] - Grup layanan (opsional)
 * @body {string} [intro_video_url] - URL video pengantar
 * @body {string} [overview] - Ikhtisar layanan
 * @body {string} [scope] - Ruang lingkup
 * @body {string} [benefit] - Manfaat layanan
 * @body {string} [output] - Output/hasil layanan
 * @body {string} [regulation_ref] - Referensi regulasi
 * @body {string} [portfolio_id] - ID portfolio (opsional)
 * @body {string} [sub_portfolio_id] - ID sub portfolio (opsional)
 * @body {string} [sbu_owner_id] - ID unit SBU pemilik
 * @body {array} [sectors] - Array ID sektor
 * @body {array} [sub_sectors] - Array ID sub sektor
 * @access Admin dan management SBU/PPK
 */
router.post('/', auth.authenticate, managementAccess, ctrl.createService);

/**
 * PUT /api/services/:id
 *
 * Memperbarui data layanan secara parsial (hanya field yang dikirim).
 * Mendukung update relasi sektor dan sub sektor.
 *
 * @param {string} id - ID layanan
 * @body {string} [name] - Nama baru
 * @body {string} [group] - Grup baru
 * @body {string} [intro_video_url] - URL video baru
 * @body {string} [overview] - Ikhtisar baru
 * @body {string} [scope] - Ruang lingkup baru
 * @body {string} [benefit] - Manfaat baru
 * @body {string} [output] - Output baru
 * @body {string} [regulation_ref] - Referensi regulasi baru
 * @body {string} [sbu_owner_id] - Unit SBU pemilik baru
 * @body {array} [sectors] - Array ID sektor (kirim [] untuk hapus semua)
 * @body {array} [sub_sectors] - Array ID sub sektor (kirim [] untuk hapus semua)
 * @access Admin dan management SBU/PPK
 */
router.put('/:id', auth.authenticate, managementAccess, ctrl.updateService);

/**
 * DELETE /api/services/:id
 *
 * Menghapus layanan secara permanen (hard delete).
 * Peringatan: Semua data terkait (marketing kit, revenue, relasi sektor)
 * akan ikut terhapus karena CASCADE DELETE.
 *
 * @param {string} id - ID layanan
 * @access Hanya admin (karena bersifat irreversible)
 */
router.delete('/:id', auth.authenticate, auth.authorize('admin'), ctrl.deleteService);

/**
 * POST /api/services/:id/revenue
 *
 * Menambahkan data revenue (pendapatan) untuk suatu layanan.
 * Digunakan oleh manajemen untuk mencatat nilai kontrak dengan pelanggan.
 *
 * @param {string} id - ID layanan
 * @body {string} customer_name - Nama pelanggan (wajib)
 * @body {number} revenue - Nilai pendapatan (angka positif)
 * @body {string} unit_id - ID unit yang mencatat revenue (wajib)
 * @access Admin dan management SBU/PPK
 */
router.post('/:id/revenue', auth.authenticate, managementAccess, ctrl.addServiceRevenue);

// =============================================================================
// Ekspor Router
// =============================================================================
module.exports = router;