/**
 * app.js
 *
 * Entry point aplikasi Express SAKTI.
 *
 * ============================================================
 * TANGGUNG JAWAB
 * ============================================================
 * 1. Inisialisasi koneksi database
 * 2. Konfigurasi middleware global (keamanan, parsing, logging, rate limiting)
 * 3. Pendaftaran semua route
 * 4. Global error handler
 *
 * ============================================================
 * PERBAIKAN DALAM FILE INI
 * ============================================================
 * [Fix #1]   Duplicate route registration adminRoutes → dihapus.
 * [Fix N28]  Rate limiting khusus untuk endpoint login (loginLimiter).
 * [Fix N44]  Body size limit ditambahkan (2mb).
 *
 * ============================================================
 * ENVIRONMENT VARIABLES YANG DIGUNAKAN
 * ============================================================
 * NODE_ENV         - development, test, atau production
 * RATE_LIMIT_SKIP  - (true) melewati rate limiting (hanya untuk testing)
 */

// ============================================================================
// Dependencies & Konfigurasi Awal
// ============================================================================
require('dotenv').config({ debug: process.env.NODE_ENV === 'development' });

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');

// ============================================================================
// Inisialisasi App & Koneksi Database
// ============================================================================

/**
 * Inisialisasi aplikasi Express.
 * @type {express.Application}
 */
const app = express();

/**
 * Melakukan autentikasi koneksi ke database.
 * Server tetap berjalan meskipun gagal — Sequelize akan retry per query.
 */
sequelize.authenticate()
  .then(() => console.log('[DB] Koneksi database berhasil'))
  .catch((err) => console.error('[DB] Koneksi database gagal:', err.message));

// trust proxy: diperlukan agar express-rate-limit membaca IP asli
// saat API berjalan di balik reverse proxy (Nginx, load balancer, dll)
app.set('trust proxy', process.env.NODE_ENV === 'production');

// ============================================================================
// Konfigurasi CORS (Cross-Origin Resource Sharing)
// ============================================================================

/**
 * Opsi konfigurasi CORS.
 * Hanya mengizinkan origin yang dikenal untuk mencegah cross-site request.
 */
const corsOptions = {
  origin: [
    'http://localhost:5173',          // Development (Vite default)
    'https://sakti-drab.vercel.app',  // Production frontend
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true,               // Mengizinkan cookies & Authorization header
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Menangani preflight OPTIONS request

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Fungsi helper untuk menentukan apakah rate limiting dilewati.
 * Digunakan untuk testing agar tidak terblokir.
 *
 * @returns {boolean} true jika harus melewati rate limiting
 */
function skipRateLimit() {
  return process.env.NODE_ENV === 'test' || process.env.RATE_LIMIT_SKIP === 'true';
}

/**
 * globalLimiter - Rate limiter untuk semua endpoint.
 * Melindungi dari DDoS sederhana dan scraping berlebihan.
 * 100 request per 15 menit per IP.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,          // 15 menit
  max: 100,                           // 100 request per window
  standardHeaders: true,              // Kirim header RateLimit-* standar
  legacyHeaders: false,               // Matikan header X-RateLimit-* lama
  message: {
    success: false,
    pesan: 'Terlalu banyak permintaan dari IP ini. Silakan coba lagi dalam 15 menit.',
  },
  skip: skipRateLimit,
});

/**
 * loginLimiter - Rate limiter ketat untuk endpoint autentikasi sensitif.
 * Mencegah brute force attack pada login, register, forgot-password.
 * Hanya percobaan GAGAL yang dihitung (skipSuccessfulRequests: true).
 *
 * [Fix N28] Batas lebih ketat: 10 percobaan per 15 menit.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,          // 15 menit
  max: 10,                            // 10 percobaan per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,       // Hanya percobaan GAGAL yang dihitung
  message: {
    success: false,
    pesan: 'Terlalu banyak percobaan. Akun sementara diblokir. Silakan coba lagi dalam 15 menit.',
  },
  skip: skipRateLimit,
});

// ============================================================================
// Security Middleware
// ============================================================================

/**
 * helmet - Memasang berbagai header keamanan HTTP.
 * Termasuk X-Frame-Options, X-XSS-Protection, X-Content-Type-Options, dll.
 */
app.use(helmet());

/**
 * Menerapkan global rate limiter ke semua route.
 * Endpoint sensitif akan dikenakan rate limiter tambahan di level route.
 */
app.use(globalLimiter);

// ============================================================================
// Request Parsing & Logging
// ============================================================================

/**
 * Morgan - HTTP request logger.
 * Di production menggunakan format 'combined', di development 'dev'.
 */
app.use(logger(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

/**
 * Body parsers dengan batas ukuran eksplisit.
 * [Fix N44] Mencegah request body terlalu besar yang dapat menyebabkan memory pressure.
 */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(cookieParser());

/**
 * Melayani file statis dari direktori 'public'.
 */
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// Routes
// ============================================================================

/**
 * CATATAN PENTING (Fix #1):
 * Setiap route group didaftarkan SATU KALI dengan base path yang benar.
 * adminRoutes sebelumnya didaftarkan dua kali (di '/api/users' DAN '/api/admin').
 * Registrasi '/api/users' telah dihapus — hanya '/api/admin' yang digunakan.
 */

// --- Autentikasi ---
// loginLimiter akan digunakan secara selektif di dalam authRoutes
app.use('/api/auth', require('./routes/authRoutes'));

// --- Data Master ---
app.use('/api/units', require('./routes/unitRoutes'));
app.use('/api/portfolios', require('./routes/portfolioRoutes'));
app.use('/api/sectors', require('./routes/sectorRoutes'));

// --- Layanan & Marketing Kit ---
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/marketing-kits', require('./routes/marketingKitRoutes'));

// --- Administrasi (Hanya Admin) ---
app.use('/api/admin', require('./routes/adminRoutes'));

// ============================================================================
// Global Error Handler
// ============================================================================

/**
 * Middleware penanganan error global.
 * Menangkap semua error yang tidak tertangani di controller/middleware.
 *
 * @param {Error} err - Objek error
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Log error lengkap di server (stack trace untuk debugging)
  console.error('[Global Error Handler]', err.stack || err);

  // Di production: jangan bocorkan stack trace ke client
  // Di development: kirim detail error untuk memudahkan debugging
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    success: false,
    pesan: isDevelopment
      ? err.message
      : 'Terjadi kesalahan internal pada server. Silakan coba lagi.',
    ...(isDevelopment && { stack: err.stack }),
  });
});

// ============================================================================
// Ekspor loginLimiter untuk digunakan di authRoutes
// ============================================================================
app.locals.loginLimiter = loginLimiter;
app.locals.globalLimiter = globalLimiter;

// ============================================================================
// Ekspor app
// ============================================================================
module.exports = app;