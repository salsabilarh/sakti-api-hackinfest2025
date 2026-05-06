/**
 * routes/unitRoutes.js
 *
 * Route untuk mengelola data Unit Kerja.
 * Base path: /api/units
 *
 * ============================================================
 * DESAIN KHUSUS: ENDPOINT PUBLIK UNTUK GET
 * ============================================================
 * GET / dan GET /:id sengaja TIDAK memerlukan autentikasi.
 * Alasan: Halaman registrasi membutuhkan daftar unit kerja untuk dropdown
 * sebelum user memiliki token JWT. Jika kebutuhan keamanan berubah,
 * cukup tambahkan `auth.authenticate` pada kedua route tersebut.
 *
 * ============================================================
 * STRUKTUR OTORISASI
 * ============================================================
 * - READ (GET) : Publik (tanpa autentikasi) — untuk keperluan registrasi
 * - WRITE (POST, PUT, DELETE) : Hanya admin (auth.authorize('admin'))
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Jika data unit kerja bersifat sensitif di masa depan, tambahkan
 *   middleware `auth.authenticate` ke route GET.
 * - Endpoint DELETE akan gagal (409 Conflict) jika unit masih memiliki
 *   user aktif karena foreign key constraint (ON DELETE RESTRICT).
 */

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/unitController');
const auth = require('../middlewares/authMiddleware');

// =============================================================================
// READ ROUTES (PUBLIK - Tidak memerlukan autentikasi)
// =============================================================================

/**
 * GET /api/units
 *
 * Mendapatkan daftar semua unit kerja dengan dukungan filter dan pagination.
 * Endpoint ini bersifat publik untuk keperluan registrasi.
 *
 * Query params (opsional):
 *   - type   : Filter berdasarkan tipe unit (sbu|ppk|cabang|unit|divisi|lainnya)
 *   - search : Pencarian berdasarkan nama unit
 *   - page   : Halaman (jika disertakan, aktifkan pagination)
 *   - limit  : Item per halaman (maks 100)
 *
 * @access Publik (tanpa token)
 */
router.get('/', ctrl.getAllUnits);

/**
 * GET /api/units/:id
 *
 * Mendapatkan detail satu unit kerja berdasarkan ID.
 * Endpoint ini bersifat publik.
 *
 * @param {string} id - UUID unit kerja
 * @access Publik (tanpa token)
 */
router.get('/:id', ctrl.getUnitById);

// =============================================================================
// WRITE ROUTES (HANYA UNTUK ADMIN)
// =============================================================================

/**
 * POST /api/units
 *
 * Membuat unit kerja baru.
 *
 * @body {string} name - Nama unit (wajib)
 * @body {string} [code] - Kode unit (opsional, harus unik)
 * @body {string} type - Tipe unit (salah satu dari UNIT_TYPES)
 * @access Hanya admin
 */
router.post(
  '/',
  auth.authenticate,
  auth.authorize('admin'),
  ctrl.createUnit
);

/**
 * PUT /api/units/:id
 *
 * Memperbarui data unit kerja secara parsial.
 *
 * @param {string} id - UUID unit kerja
 * @body {string} [name] - Nama baru
 * @body {string} [code] - Kode baru (kirim "" untuk menghapus kode)
 * @body {string} [type] - Tipe baru
 * @access Hanya admin
 */
router.put(
  '/:id',
  auth.authenticate,
  auth.authorize('admin'),
  ctrl.updateUnit
);

/**
 * DELETE /api/units/:id
 *
 * Menghapus unit kerja secara permanen (hard delete).
 * Akan gagal (409 Conflict) jika masih ada user aktif yang terdaftar di unit ini.
 *
 * @param {string} id - UUID unit kerja
 * @access Hanya admin
 */
router.delete(
  '/:id',
  auth.authenticate,
  auth.authorize('admin'),
  ctrl.deleteUnit
);

// =============================================================================
// Ekspor Router
// =============================================================================
module.exports = router;