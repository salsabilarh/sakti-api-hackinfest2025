// =============================================================================
// routes/adminRoutes.js
// =============================================================================
// Semua endpoint di file ini mengelola operasi administrasi sistem SAKTI,
// termasuk manajemen user, verifikasi pendaftaran, reset password,
// permintaan pindah unit, dan log download.
//
// Base path: /api/admin
// Seluruh route dilindungi oleh middleware:
//   authenticate - memastikan user login (JWT valid)
//   authorize('admin') - memastikan role user adalah 'admin'
// =============================================================================

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// =============================================================================
// Middleware untuk semua route di file ini (admin only)
// =============================================================================
const adminOnly = [authenticate, authorize('admin')];

// =============================================================================
// Dashboard
// =============================================================================

/**
 * GET /api/admin/dashboard
 *
 * Menampilkan statistik ringkasan untuk halaman dashboard admin.
 * Data yang dikembalikan: total pengguna terverifikasi, pengguna menunggu verifikasi,
 * pengguna aktif 30 hari terakhir, total download, permintaan pindah unit pending,
 * dan permintaan reset password yang belum diproses.
 */
router.get('/dashboard', ...adminOnly, ctrl.getDashboardStats);

// =============================================================================
// Manajemen User (CRUD + filter + pagination)
// =============================================================================

/**
 * GET /api/admin/users
 *
 * Mendapatkan daftar semua pengguna dengan dukungan:
 * - Pencarian (search) by name/email
 * - Filter by role, unit, status aktif, status verifikasi
 * - Sorting (whitelist kolom aman)
 * - Pagination (dengan batas maksimum 100 item per halaman)
 */
router.get('/users', ...adminOnly, ctrl.getAllUsers);

/**
 * POST /api/admin/users
 *
 * Membuat akun pengguna baru secara langsung oleh admin.
 * Password di-generate secara acak (96-bit entropy) dan dikembalikan sekali dalam response.
 * User yang dibuat langsung diverifikasi (is_verified = true).
 */
router.post('/users', ...adminOnly, ctrl.createUser);

/**
 * PUT /api/admin/users/:id
 *
 * Memperbarui data pengguna (email, nama, role, unit, status aktif, status verifikasi).
 * Hanya field yang dikirim yang akan diubah.
 */
router.put('/users/:id', ...adminOnly, ctrl.updateUser);

/**
 * DELETE /api/admin/users/:id
 *
 * Menghapus pengguna secara permanen (hard delete).
 * Peringatan: Admin tidak dapat menghapus akun sendiri, dan tidak boleh menghapus
 * satu-satunya admin yang tersisa di sistem.
 */
router.delete('/users/:id', ...adminOnly, ctrl.deleteUser);

/**
 * GET /api/admin/users/:id/temporary-password
 *
 * Mengambil password sementara pengguna yang masih aktif (belum diganti).
 * Password didekripsi dari kolom `temporary_password` (AES-256-CBC).
 * Endpoint ini berguna jika admin lupa mencatat password saat membuat akun.
 */
router.get('/users/:id/temporary-password', ...adminOnly, ctrl.getTemporaryPassword);

// =============================================================================
// Verifikasi Pendaftaran (User dengan is_verified = null)
// =============================================================================

/**
 * GET /api/admin/waiting-users
 *
 * Mendapatkan daftar pengguna yang menunggu verifikasi (is_verified = null).
 * Diurutkan dari yang paling lama mendaftar (FIFO).
 */
router.get('/waiting-users', ...adminOnly, ctrl.getWaitingUsers);

/**
 * POST /api/admin/waiting-users/:id/approve
 *
 * Menyetujui pendaftaran pengguna (set is_verified = true).
 * Hanya dapat dilakukan jika status masih pending (null).
 */
router.post('/waiting-users/:id/approve', ...adminOnly, ctrl.approveUser);

/**
 * POST /api/admin/waiting-users/:id/reject
 *
 * Menolak pendaftaran pengguna (set is_verified = false).
 * Hanya dapat dilakukan jika status masih pending (null).
 */
router.post('/waiting-users/:id/reject', ...adminOnly, ctrl.rejectUser);

// =============================================================================
// Permintaan Reset Password (User → Admin)
// =============================================================================

/**
 * GET /api/admin/password-reset-requests
 *
 * Mendapatkan daftar permintaan reset password yang belum diproses.
 * Hanya satu permintaan terawal per pengguna yang ditampilkan.
 */
router.get('/password-reset-requests', ...adminOnly, ctrl.getPasswordResetRequests);

/**
 * POST /api/admin/password-reset-requests/:id/reset
 *
 * Mereset password pengguna ke password acak yang kuat (96-bit entropy).
 * Password sementara dienkripsi dan disimpan di kolom `temporary_password`.
 * Response mengembalikan password sementara SEKALI untuk disampaikan ke user.
 */
router.post('/password-reset-requests/:id/reset', ...adminOnly, ctrl.resetUserPassword);

// =============================================================================
// Permintaan Perubahan Unit Kerja
// =============================================================================

/**
 * GET /api/admin/unit-change-requests
 *
 * Mendapatkan daftar permintaan perubahan unit kerja.
 * Mendukung filter status (pending/approved/rejected) dan pagination.
 */
router.get('/unit-change-requests', ...adminOnly, ctrl.getUnitChangeRequests);

/**
 * PUT /api/admin/unit-change-requests/:request_id/process
 *
 * Memproses permintaan perubahan unit (approve atau reject).
 * Operasi bersifat atomik menggunakan database transaction:
 * - Approve: mengubah unit_kerja_id user dan status request menjadi 'approved'
 * - Reject: hanya mengubah status request menjadi 'rejected'
 */
router.put('/unit-change-requests/:request_id/process', ...adminOnly, ctrl.processUnitChangeRequest);

// =============================================================================
// Audit Logs
// =============================================================================

/**
 * GET /api/admin/download-logs
 *
 * Mendapatkan log semua aktivitas download marketing kit.
 * Mendukung pencarian berdasarkan nama kit, nama user, atau tujuan download.
 */
router.get('/download-logs', ...adminOnly, ctrl.getDownloadLogs);

// =============================================================================
// Ekspor router
// =============================================================================
module.exports = router;