/**
 * routes/authRoutes.js
 *
 * Route untuk autentikasi dan manajemen sesi pengguna SAKTI.
 * Base path: /api/auth
 *
 * ============================================================
 * ARSITEKTUR DUAL-TOKEN
 * ============================================================
 * POST   /login              → access_token (short-lived) + refresh_token
 * POST   /refresh            → tukar refresh_token → access_token baru
 * DELETE /logout             → revoke satu refresh_token (logout satu perangkat)
 * DELETE /logout-all         → revoke semua refresh_token (logout semua perangkat)
 *
 * ============================================================
 * KEAMANAN RATE LIMITING
 * ============================================================
 * Endpoint publik yang sensitif dilindungi rate limiter (10 req/15 menit):
 *   - POST /register           → cegah spam pendaftaran
 *   - POST /login              → cegah brute force
 *   - POST /forgot-password    → cegah spam permintaan reset
 *   - POST /refresh            → cegah enumerasi session
 *
 * Rate limiter diambil dari `req.app.locals.loginLimiter` (dikonfigurasi di app.js).
 * Jika tidak tersedia (test/development), middleware no-op digunakan.
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Endpoint terautentikasi: gunakan middleware `authenticate`
 * - Endpoint khusus user non-admin: tambahkan `denyRole('admin')`
 * - Jika endpoint publik baru ditambahkan, pastikan memakai `loginRateLimit`
 * - Controller functions: lihat `controllers/authController.js`
 *
 * @module authRoutes
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
 * Jika rate limiter tidak dikonfigurasi, lanjutkan tanpa pembatasan (development/test).
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
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
 * @body {string} password - Password (minimal 8 karakter, huruf besar, huruf kecil, angka, simbol)
 * @body {string} confirm_password - Konfirmasi password (harus sama)
 * @body {string} unit_kerja_id - ID unit kerja (wajib untuk role non-admin)
 * @body {string} role - Role yang dipilih (management/viewer)
 * @throws {400} Jika field wajib tidak diisi atau tidak valid
 * @throws {409} Jika email sudah terdaftar
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
 * @throws {401} Jika email atau password salah
 * @throws {403} Jika akun belum diverifikasi atau dinonaktifkan
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
 * @throws {401} Jika refresh token tidak valid, expired, atau telah direvoke
 */
router.post('/refresh', loginRateLimit, ctrl.refreshToken);

/**
 * POST /api/auth/forgot-password
 *
 * Mengajukan permintaan reset password ke admin.
 * Endpoint ini tidak mengirim email langsung, tetapi membuat entri di
 * tabel password_reset_requests untuk diproses oleh admin.
 * Response sama untuk email terdaftar maupun tidak (mencegah enumeration).
 *
 * @body {string} email
 * @returns {object} pesan sukses (selalu sama)
 * @throws {400} Jika email tidak diisi
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
 * @returns {object} Data profil user (nama, email, role, unit, dll)
 * @throws {401} Jika token tidak valid
 * @throws {404} Jika user tidak ditemukan
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
 * @throws {400} Jika field tidak lengkap atau password lemah
 * @throws {401} Jika password lama salah
 * @throws {500} Jika gagal menyimpan password baru
 */
router.put('/update-password', authenticate, ctrl.updatePassword);

/**
 * DELETE /api/auth/logout
 *
 * Logout dari perangkat ini saja (merevoke satu refresh token).
 * Refresh token yang digunakan harus dikirim dalam body.
 *
 * @body {string} refresh_token
 * @returns {object} { success: true, pesan: string }
 * @throws {400} Jika refresh token tidak disertakan
 * @throws (tidak ada error yang dilempar ke client, selalu return 200)
 */
router.delete('/logout', authenticate, ctrl.logout);

/**
 * DELETE /api/auth/logout-all
 *
 * Logout dari semua perangkat (merevoke semua refresh token milik user).
 * Berguna jika ada indikasi akun diretas atau ingin keamanan ekstra.
 *
 * @returns {object} { success: true, pesan: string, jumlah sesi direvoke }
 * @throws {500} Jika gagal melakukan revoke (tetap return 200 untuk keamanan)
 */
router.delete('/logout-all', authenticate, ctrl.logoutAll);

/**
 * POST /api/auth/change-request
 *
 * Mengajukan permintaan perubahan role dan/atau unit kerja ke admin.
 * Hanya user dengan role selain 'admin' yang dapat mengakses endpoint ini.
 * Minimal salah satu dari `requested_role` atau `requested_unit_id` harus diisi.
 * Satu user hanya boleh memiliki satu permintaan pending.
 *
 * @body {string} [requested_role] - Role yang diminta ('management' atau 'viewer')
 * @body {string} [requested_unit_id] - ID unit tujuan
 * @middleware authenticate - memastikan user login
 * @middleware denyRole('admin') - admin tidak boleh mengajukan perubahan
 * @throws {400} Jika tidak ada field yang diisi atau data tidak valid
 * @throws {409} Jika sudah ada permintaan pending
 * @throws {404} Jika unit tujuan tidak ditemukan atau user tidak ditemukan
 */
router.post(
  '/change-request',
  authenticate,
  denyRole('admin'),
  ctrl.requestChange
);

// ============================================================
// Ekspor Router
// ============================================================
module.exports = router;