/**
 * routes/marketingKitRoutes.js
 *
 * Route untuk mengelola marketing kit (CRUD, download, log).
 * Base path: /api/marketing-kits
 *
 * ============================================================
 * PERBAIKAN DALAM FILE INI
 * ============================================================
 * [BUG #17] Penanganan error multer (tipe file tidak valid, ukuran melebihi batas)
 *   → handleMulterError dipasang SETELAH upload middleware untuk mengubah error
 *     Multer menjadi respons 400 Bad Request, bukan 500 Internal Server Error.
 *
 * [BUG #21] Pengecekan role 'viewer' tidak perlu diulang inline.
 *   → Gunakan middleware `denyRole('viewer')` dari authMiddleware yang sudah terdefinisi.
 *   → Sebelumnya: 3 route berbeda memiliki logika (req.user.role === 'viewer') yang sama.
 *   → Sekarang: shorthands `noViewer` dan `managementAccess` digunakan secara konsisten.
 *
 * ============================================================
 * STRUKTUR OTORISASI
 * ============================================================
 * - READ endpoints (GET, POST download) : semua user KECUALI viewer
 * - WRITE endpoints (POST, PUT, DELETE) : hanya admin & management SBU/PPK
 *
 * Management access dibatasi pada unit tipe 'sbu' atau 'ppk' (melalui authorizeAdvanced).
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Jika role baru diperkenalkan, sesuaikan daftar roles di managementAccess dan noViewer.
 * - Jika tipe unit baru perlu diizinkan untuk management, tambahkan ke allowUnits.
 * - handleMulterError WAJIB dipasang untuk setiap route yang menggunakan upload.
 */

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/marketingKitController');
const auth = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadCloudinary');
const { handleMulterError } = require('../middlewares/uploadCloudinary');

// =============================================================================
// Shorthand Middleware
// =============================================================================

/**
 * noViewer - Middleware untuk memblokir role 'viewer'.
 * Semua route baca (GET) marketing kit dapat diakses oleh user terautentikasi
 * kecuali viewer. Ini memastikan viewer tidak bisa melihat daftar marketing kit.
 */
const noViewer = [auth.authenticate, auth.denyRole('viewer')];

/**
 * managementAccess - Middleware untuk membatasi akses write.
 * Hanya user dengan role 'admin' atau 'management' yang boleh mengelola marketing kit,
 * dan untuk role 'management' hanya jika unit kerja bertipe 'sbu' atau 'ppk'.
 */
const managementAccess = auth.authorizeAdvanced({
  roles: ['admin', 'management'],
  allowUnits: ['sbu', 'ppk'],
});

// =============================================================================
// READ Endpoints (Semua user kecuali viewer)
// =============================================================================

/**
 * GET /api/marketing-kits
 *
 * Mendapatkan daftar semua marketing kit.
 * Mendukung filter:
 *   - search: pencarian nama kit atau nama layanan
 *   - service: filter berdasarkan ID layanan
 *   - file_type: filter berdasarkan tipe file
 *
 * @access Semua role kecuali viewer
 */
router.get('/', ...noViewer, ctrl.getAllMarketingKits);

/**
 * GET /api/marketing-kits/:id
 *
 * Mendapatkan detail satu marketing kit beserta relasi layanan dan uploader.
 *
 * @access Semua role kecuali viewer
 */
router.get('/:id', ...noViewer, ctrl.getMarketingKitById);

/**
 * POST /api/marketing-kits/:id/download
 *
 * Menghasilkan signed Cloudinary URL (expire 60 detik) dan redirect ke file.
 * Mencatat setiap download ke tabel download_logs untuk audit trail.
 *
 * @body {string} purpose - Alasan download (wajib diisi)
 * @access Semua role kecuali viewer
 */
router.post('/:id/download', ...noViewer, ctrl.downloadMarketingKit);

// =============================================================================
// WRITE Endpoints (Hanya admin + management SBU/PPK)
// =============================================================================

/**
 * POST /api/marketing-kits
 *
 * Mengunggah satu atau lebih file marketing kit sekaligus.
 * Semua file dalam satu request akan dikaitkan dengan service_ids yang sama.
 *
 * Form-data yang diperlukan:
 *   - files[]: file-file yang akan diunggah (max 10, masing-masing max 10 MB)
 *   - service_ids[]: ID layanan yang terkait (minimal 1)
 *   - file_types[]: tipe file (misal "brochure", "datasheet") sesuai urutan file
 *
 * @middleware auth.authenticate
 * @middleware managementAccess (admin atau management dengan unit sbu/ppk)
 * @middleware upload.array('files') - menangani multiple file
 * @middleware handleMulterError - mengubah error multer menjadi 400
 */
router.post(
  '/',
  auth.authenticate,
  managementAccess,
  upload.array('files'),
  handleMulterError,
  ctrl.createMarketingKit
);

/**
 * PUT /api/marketing-kits/:id
 *
 * Memperbarui metadata marketing kit dan/atau mengganti file.
 * Field yang dapat diupdate:
 *   - file (opsional) : file baru untuk menggantikan file lama
 *   - file_type (opsional) : tipe file yang baru
 *   - service_ids[] (opsional) : daftar ID layanan baru (mengganti seluruh relasi)
 *
 * @middleware auth.authenticate
 * @middleware managementAccess
 * @middleware upload.single('file') - hanya satu file opsional
 * @middleware handleMulterError
 */
router.put(
  '/:id',
  auth.authenticate,
  managementAccess,
  upload.single('file'),
  handleMulterError,
  ctrl.updateMarketingKit
);

/**
 * DELETE /api/marketing-kits/:id
 *
 * Menghapus marketing kit secara permanen dari database dan Cloudinary.
 * Peringatan: Tindakan ini tidak dapat dibatalkan.
 *
 * @middleware auth.authenticate
 * @middleware managementAccess
 */
router.delete(
  '/:id',
  auth.authenticate,
  managementAccess,
  ctrl.deleteMarketingKit
);

// =============================================================================
// Ekspor Router
// =============================================================================
module.exports = router;