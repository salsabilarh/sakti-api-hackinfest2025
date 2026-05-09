/**
 * routes/adminRoutes.js
 *
 * Mengelola semua endpoint administrasi sistem SAKTI:
 * - Dashboard statistik
 * - Manajemen pengguna (CRUD, filter, pagination, temporary password)
 * - Verifikasi pendaftaran (approve/reject)
 * - Permintaan reset password (admin-driven)
 * - Permintaan perubahan unit dan/atau role (approve/reject)
 * - Log download marketing kit
 *
 * Base path: /api/admin
 *
 * ============================================================
 * KEAMANAN
 * ============================================================
 * Semua endpoint dilindungi oleh middleware:
 *   - authenticate : memastikan user login (JWT valid)
 *   - authorize('admin') : memastikan role user adalah 'admin'
 *
 * Tidak ada pengecekan role inline di controller karena sudah ditangani di sini.
 *
 * ============================================================
 * ENDPOINT GROUPS
 * ============================================================
 * 1. Dashboard          : GET /dashboard
 * 2. User Management    : CRUD users + temporary-password
 * 3. Waiting Users      : GET, approve, reject
 * 4. Password Reset     : GET requests, POST reset
 * 5. Unit/Role Change   : GET change-requests, PUT process
 * 6. Audit Logs         : GET download-logs
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Semua route yang memerlukan akses admin menggunakan middleware `adminOnly`.
 * - Jika ada endpoint baru yang membutuhkan akses admin, cukup tambahkan ke grup yang sesuai.
 * - Jangan lupa untuk menambahkan controller yang sesuai di `adminController.js`.
 * - Perhatikan penggunaan `ctrl.processChangeRequest` (endpoint baru) untuk perubahan role+unit.
 */

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// =============================================================================
// Middleware untuk semua route di file ini (admin only)
// =============================================================================
const adminOnly = [authenticate, authorize('admin')];

// =============================================================================
// 1. Dashboard
// =============================================================================

/**
 * GET /api/admin/dashboard
 *
 * Mengembalikan statistik ringkasan:
 * - total_pengguna
 * - menunggu_verifikasi
 * - pengguna_aktif_30_hari
 * - total_download
 * - permintaan_pindah_unit
 * - permintaan_reset_password
 */
router.get('/dashboard', ...adminOnly, ctrl.getDashboardStats);

// =============================================================================
// 2. Manajemen Pengguna (CRUD + filter + pagination)
// =============================================================================

/**
 * GET /api/admin/users
 *
 * Mendapatkan daftar semua pengguna.
 * Query params: search, role, unit, is_active, verified, sort, direction, page, limit
 */
router.get('/users', ...adminOnly, ctrl.getAllUsers);

/**
 * POST /api/admin/users
 *
 * Membuat akun pengguna baru. Password sementara di-generate acak.
 * User langsung diverifikasi (is_verified = true).
 */
router.post('/users', ...adminOnly, ctrl.createUser);

/**
 * PUT /api/admin/users/:id
 *
 * Memperbarui data pengguna (field yang dikirim saja).
 * Dapat mengubah nama, email, role, unit, status aktif, status verifikasi.
 */
router.put('/users/:id', ...adminOnly, ctrl.updateUser);

/**
 * DELETE /api/admin/users/:id
 *
 * Menghapus akun pengguna secara permanen.
 * Cegah penghapusan admin terakhir dan akun sendiri.
 */
router.delete('/users/:id', ...adminOnly, ctrl.deleteUser);

/**
 * GET /api/admin/users/:id/temporary-password
 *
 * Mendapatkan password sementara pengguna (jika masih ada).
 * Password didekripsi AES-256-CBC.
 */
router.get('/users/:id/temporary-password', ...adminOnly, ctrl.getTemporaryPassword);

// =============================================================================
// 3. Verifikasi Pendaftaran (User dengan is_verified = null)
// =============================================================================

/**
 * GET /api/admin/waiting-users
 *
 * Daftar pengguna yang menunggu persetujuan (FIFO berdasarkan created_at).
 */
router.get('/waiting-users', ...adminOnly, ctrl.getWaitingUsers);

/**
 * POST /api/admin/waiting-users/:id/approve
 *
 * Menyetujui pendaftaran (set is_verified = true).
 * Hanya jika status masih null.
 */
router.post('/waiting-users/:id/approve', ...adminOnly, ctrl.approveUser);

/**
 * POST /api/admin/waiting-users/:id/reject
 *
 * Menolak pendaftaran (hapus user) jika tidak memiliki data terkait (marketing kit, service).
 * Hanya jika status masih null.
 */
router.post('/waiting-users/:id/reject', ...adminOnly, ctrl.rejectUser);

// =============================================================================
// 4. Permintaan Reset Password (Admin-driven)
// =============================================================================

/**
 * GET /api/admin/password-reset-requests
 *
 * Mendapatkan daftar permintaan reset password yang belum diproses.
 * Satu permintaan terawal per user.
 */
router.get('/password-reset-requests', ...adminOnly, ctrl.getPasswordResetRequests);

/**
 * POST /api/admin/password-reset-requests/:id/reset
 *
 * Mereset password user ke password acak.
 * Password sementara dienkripsi dan disimpan, refresh token direvoke.
 */
router.post('/password-reset-requests/:id/reset', ...adminOnly, ctrl.resetUserPassword);

// =============================================================================
// 5. Permintaan Perubahan Unit dan/atau Role
// =============================================================================

/**
 * GET /api/admin/change-requests
 *
 * Mendapatkan daftar semua permintaan perubahan (role dan/atau unit).
 * Mendukung filter status dan pagination.
 */
router.get('/change-requests', ...adminOnly, ctrl.getChangeRequests);

/**
 * PUT /api/admin/change-requests/:request_id/process
 *
 * Memproses permintaan perubahan role dan/atau unit secara atomik.
 * Action dapat berupa 'approve' atau 'reject'.
 * Jika approve: akan mengupdate role dan/atau unit user sesuai permintaan.
 */
router.put('/change-requests/:request_id/process', ...adminOnly, ctrl.processChangeRequest);

// =============================================================================
// 6. Audit Logs
// =============================================================================

/**
 * GET /api/admin/download-logs
 *
 * Mendapatkan log semua aktivitas download marketing kit.
 * Mendukung pencarian (search) berdasarkan nama kit, nama user, atau tujuan.
 */
router.get('/download-logs', ...adminOnly, ctrl.getDownloadLogs);

// =============================================================================
// Ekspor router
// =============================================================================
module.exports = router;