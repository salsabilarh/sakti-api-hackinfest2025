/**
 * routes/authRoutes.js
 *
 * Route untuk autentikasi dan manajemen sesi pengguna SAKTI.
 * Base path: /api/auth
 *
 * ============================================================
 * ARSITEKTUR DUAL-TOKEN (Fix N24)
 * ============================================================
 * POST   /login              → access_token + refresh_token
 * POST   /refresh            → tukar refresh_token → access_token baru
 * DELETE /logout             → revoke satu refresh_token (logout dari device ini)
 * DELETE /logout-all         → revoke semua refresh_token (logout dari semua device)
 *
 * ============================================================
 * KEAMANAN RATE LIMITING (Fix N28)
 * ============================================================
 * Endpoint publik yang sensitif dilindungi oleh rate limiter:
 * - POST /register           mencegah spam pendaftaran akun
 * - POST /login              mencegah brute force attack
 * - POST /forgot-password    mencegah spam permintaan reset
 * - POST /refresh            mencegah enumerasi session
 *
 * Rate limiter diambil dari `req.app.locals.loginLimiter` (dikonfigurasi di app.js).
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Semua endpoint yang memerlukan autentikasi menggunakan middleware `authenticate`
 * - Endpoint `/unit-change-request` juga menggunakan `denyRole('admin')` karena
 *   admin tidak memiliki unit kerja dan tidak boleh mengajukan pindah unit.
 * - Jika perlu menambah endpoint publik sensitif, pastikan menambahkan rate limiter.
 */

// ============================================================
// Dependencies
// ============================================================
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { authenticate, denyRole } = require('../middlewares/authMiddleware');

// ============================================================
// Helper: Mendapatkan Rate Limiter dari app.locals
// ============================================================

/**
 * Mengambil instance rate limiter yang sudah dikonfigurasi di app.js.
 * Jika tidak tersedia (misalnya saat unit test), memberikan fallback no-op.
 *
 * @param {Object} req - Express request object
 * @returns {Function} Middleware rate limiter atau no-op fallback
 */
function getLoginLimiter(req) {
  return req.app.locals.loginLimiter;
}

/**
 * Middleware wrapper untuk rate limiting pada endpoint sensitif.
 * Jika rate limiter tidak dikonfigurasi, lanjutkan tanpa pembatasan (development).
 */
const loginRateLimit = (req, res, next) => {
  const limiter = getLoginLimiter(req);
  if (limiter) return limiter(req, res, next);
  return next(); // fallback untuk development atau test environment
};

// ============================================================
// Endpoint Publik (Tidak Memerlukan Access Token)
// ============================================================

/**
 * POST /api/auth/register
 *
 * Mendaftarkan akun baru.
 * Status awal: is_verified = null (menunggu persetujuan admin).
 * Role 'admin' tidak dapat didaftar melalui endpoint ini.
 *
 * @body {string} full_name - Nama lengkap
 * @body {string} email - Alamat email
 * @body {string} password - Password (minimal 8 karakter, mengandung huruf besar, huruf kecil, angka, simbol)
 * @body {string} confirm_password - Konfirmasi password (harus sama)
 * @body {string} unit_kerja_id - ID unit kerja (wajib untuk role non-admin)
 * @body {string} role - Role yang dipilih (management/viewer)
 */
router.post('/register', loginRateLimit, ctrl.register);

/**
 * POST /api/auth/login
 *
 * Login dan mendapatkan pasangan access_token + refresh_token.
 * Urutan validasi aman (mencegah user enumeration):
 *   - Cek email & password terlebih dahulu dengan pesan generik
 *   - Setelah password benar, baru cek is_verified dan is_active
 *
 * @body {string} email
 * @body {string} password
 * @returns {object} { access_token, refresh_token, expires_in, user_data }
 */
router.post('/login', loginRateLimit, ctrl.login);

/**
 * POST /api/auth/refresh
 *
 * Menukar refresh_token yang masih valid (belum expired dan belum direvoke)
 * dengan access_token baru. Digunakan ketika access_token sudah kadaluwarsa.
 *
 * @body {string} refresh_token
 * @returns {object} { access_token, expires_in }
 */
router.post('/refresh', loginRateLimit, ctrl.refreshToken);

/**
 * POST /api/auth/forgot-password
 *
 * Mengajukan permintaan reset password ke admin.
 * Endpoint ini tidak mengirim email langsung, tetapi membuat entri di
 * tabel password_reset_requests untuk diproses oleh admin.
 *
 * @body {string} email
 * @returns {object} pesan sukses (sama untuk email terdaftar maupun tidak)
 */
router.post('/forgot-password', loginRateLimit, ctrl.forgotPassword);

// ============================================================
// Endpoint Terautentikasi (Memerlukan Access Token Valid)
// ============================================================

/**
 * GET /api/auth/profile
 *
 * Mengambil data profil pengguna yang sedang login dari database
 * (bukan hanya dari JWT payload) sehingga selalu up-to-date.
 *
 * @header Authorization: Bearer <access_token>
 */
router.get('/profile', authenticate, ctrl.getProfile);

/**
 * PUT /api/auth/update-password
 *
 * Mengganti password pengguna sendiri.
 * Memerlukan password lama sebagai verifikasi.
 * Setelah berhasil, semua refresh token direvoke → pengguna harus login ulang.
 *
 * @body {string} current_password
 * @body {string} new_password
 * @body {string} confirm_password
 */
router.put('/update-password', authenticate, ctrl.updatePassword);

/**
 * DELETE /api/auth/logout
 *
 * Logout dari perangkat ini saja (merevoke satu refresh token).
 * Refresh token yang digunakan harus dikirim dalam body.
 *
 * @body {string} refresh_token
 */
router.delete('/logout', authenticate, ctrl.logout);

/**
 * DELETE /api/auth/logout-all
 *
 * Logout dari semua perangkat (merevoke semua refresh token milik user).
 * Berguna jika ada indikasi akun diretas atau ingin keamanan ekstra.
 */
router.delete('/logout-all', authenticate, ctrl.logoutAll);

/**
 * POST /api/auth/unit-change-request
 *
 * Mengajukan permintaan pindah unit kerja ke admin.
 * Hanya user dengan role selain 'admin' yang dapat mengakses endpoint ini.
 *
 * @body {string} requested_unit_id - ID unit tujuan
 * @middleware authenticate - memastikan user login
 * @middleware denyRole('admin') - admin tidak memiliki unit kerja, tidak boleh mengajukan
 */
router.post(
  '/unit-change-request',
  authenticate,
  denyRole('admin'),
  ctrl.requestUnitChange
);

// ============================================================
// Ekspor Router
// ============================================================
module.exports = router;