// =============================================================================
// routes/sectorRoutes.js
// =============================================================================
// Route untuk mengelola data Sektor dan Sub Sektor.
// Base path: /api/sectors
// =============================================================================
// STRUKTUR OTORISASI
// =============================================================================
// - READ (GET) : Semua user terautentikasi (auth.authenticate)
// - WRITE (POST, PUT, DELETE) : Hanya admin dan management SBU/PPK
//   (menggunakan middleware managementAccess)
// =============================================================================
// PANDUAN MAINTENANCE
// =============================================================================
// - Tidak ada masalah route ordering karena tidak ada route statis yang
//   berpotensi tabrakan dengan parameter dinamis. Namun jika nanti menambah
//   route seperti /export, letakkan di atas route /:id.
// - Management access dapat disesuaikan dengan mengubah array roles atau allowUnits.

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sectorController');
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
 * GET /api/sectors
 *
 * Mendapatkan daftar semua sektor beserta sub sektor di dalamnya.
 * Mendukung filter opsional berdasarkan nama (query param 'search').
 *
 * @access Semua user terautentikasi
 */
router.get('/', auth.authenticate, ctrl.getAllSectors);

/**
 * GET /api/sectors/:id
 *
 * Mendapatkan detail satu sektor beserta semua sub sektor di dalamnya.
 *
 * @access Semua user terautentikasi
 */
router.get('/:id', auth.authenticate, ctrl.getSectorById);

// =============================================================================
// WRITE ROUTES (Admin dan management SBU/PPK)
// =============================================================================

/**
 * POST /api/sectors
 *
 * Membuat sektor baru.
 *
 * @body {string} name - Nama sektor (wajib)
 * @body {string} code - Kode sektor (wajib, unik)
 * @access Admin dan management SBU/PPK
 */
router.post('/', auth.authenticate, managementAccess, ctrl.createSector);

/**
 * PUT /api/sectors/:id
 *
 * Memperbarui data sektor (nama dan/atau kode).
 *
 * @param {string} id - ID sektor
 * @body {string} [name] - Nama baru (opsional)
 * @body {string} [code] - Kode baru (opsional)
 * @access Admin dan management SBU/PPK
 */
router.put('/:id', auth.authenticate, managementAccess, ctrl.updateSector);

/**
 * DELETE /api/sectors/:id
 *
 * Menghapus sektor beserta semua sub sektor di dalamnya (CASCADE).
 * Peringatan: Sektor yang memiliki layanan aktif tidak dapat dihapus.
 *
 * @param {string} id - ID sektor
 * @access Admin dan management SBU/PPK
 */
router.delete('/:id', auth.authenticate, managementAccess, ctrl.deleteSector);

// =============================================================================
// SUB SEKTOR ROUTES (bersarang di bawah sektor tertentu)
// =============================================================================

/**
 * POST /api/sectors/:sector_id/sub-sectors
 *
 * Membuat sub sektor baru di bawah sektor tertentu.
 *
 * @param {string} sector_id - ID sektor induk (dari URL)
 * @body {string} name - Nama sub sektor (wajib)
 * @body {string} code - Kode sub sektor (wajib, unik dalam satu sektor)
 * @access Admin dan management SBU/PPK
 */
router.post(
  '/:sector_id/sub-sectors',
  auth.authenticate,
  managementAccess,
  ctrl.createSubSector
);

/**
 * PUT /api/sectors/:sector_id/sub-sectors/:sub_sector_id
 *
 * Memperbarui nama dan/atau kode sub sektor.
 * Sub sektor harus milik sector_id yang sesuai di URL.
 *
 * @param {string} sector_id - ID sektor induk
 * @param {string} sub_sector_id - ID sub sektor yang akan diupdate
 * @body {string} [name] - Nama baru (opsional)
 * @body {string} [code] - Kode baru (opsional)
 * @access Admin dan management SBU/PPK
 */
router.put(
  '/:sector_id/sub-sectors/:sub_sector_id',
  auth.authenticate,
  managementAccess,
  ctrl.updateSubSector
);

/**
 * DELETE /api/sectors/:sector_id/sub-sectors/:sub_sector_id
 *
 * Menghapus sub sektor secara permanen.
 * Sub sektor harus milik sector_id yang sesuai di URL.
 *
 * @param {string} sector_id - ID sektor induk
 * @param {string} sub_sector_id - ID sub sektor yang akan dihapus
 * @access Admin dan management SBU/PPK
 */
router.delete(
  '/:sector_id/sub-sectors/:sub_sector_id',
  auth.authenticate,
  managementAccess,
  ctrl.deleteSubSector
);

// =============================================================================
// Ekspor Router
// =============================================================================
module.exports = router;