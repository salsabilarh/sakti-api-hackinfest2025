/**
 * Koneksi Database Sequelize
 * ===========================
 * File ini bertanggung jawab membuat dan mengkonfigurasi koneksi ke database MySQL
 * menggunakan connection string DATABASE_URL (format: mysql://user:pass@host:port/dbname).
 *
 * Digunakan oleh:
 *   - Model (definisi tabel)
 *   - Migration (sequelize-cli)
 *   - Seeders
 *   - Aplikasi utama (app.js / bin/www)
 *
 * Keuntungan menggunakan DATABASE_URL:
 *   - Memudahkan deployment di platform seperti Heroku, Railway, atau Docker
 *   - Semua informasi koneksi dalam satu variabel environment
 *   - Lebih aman karena token tidak terpisah-pisah
 *
 * Jika tidak ingin menggunakan DATABASE_URL, bisa mengadaptasi kode ini untuk membaca
 * DB_USER, DB_PASS, DB_NAME, DB_HOST, DB_PORT secara terpisah.
 */

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

// Muat environment variables dari file .env (opsional, karena biasanya sudah dimuat di app.js)
dotenv.config();

// ============================================================
// Konfigurasi Connection Pool
// ============================================================
// Pooling koneksi mengurangi overhead membuat koneksi baru setiap kali query.
// Nilai default cukup untuk aplikasi kecil-menengah.
const poolConfig = {
  max: 5,           // maksimum koneksi dalam pool
  min: 0,           // minimum koneksi (0 = tidak ada idle connection)
  acquire: 30000,   // waktu maksimum (ms) untuk mencoba koneksi sebelum timeout
  idle: 10000,      // waktu (ms) koneksi idle akan dilepaskan
};

// ============================================================
// Inisialisasi Sequelize dengan DATABASE_URL
// ============================================================
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql',        // driver database yang digunakan
  logging: false,          // matikan log SQL; set ke console.log untuk debugging
  pool: poolConfig,
  // Opsi tambahan (opsional):
  // retry: { max: 3 },    // jumlah retry saat koneksi gagal
  // timezone: '+07:00',   // atur zona waktu jika perlu
});

// ============================================================
// Verifikasi Koneksi (Hanya untuk informasi startup)
// ============================================================
// Fungsi ini tidak memblokir ekspor; ia berjalan async tanpa await.
// Jika koneksi gagal, error akan dicetak ke console, namun aplikasi tetap berjalan.
// Sequelize akan mencoba ulang secara internal setiap kali query dijalankan.
(async () => {
  try {
    await sequelize.authenticate();
    console.log('[DB] Koneksi ke database berhasil.');
  } catch (error) {
    console.error('[DB] Koneksi database GAGAL:', error.message);
    // Di production, mungkin perlu mengirim alert ke sistem monitoring.
  }
})();

// ============================================================
// Ekspor instance Sequelize dan kelas Sequelize itu sendiri
// ============================================================
// Dengan mengekspor keduanya, model dapat melakukan:
//   const { sequelize, Sequelize } = require('../models');
//   const { DataTypes } = Sequelize;
module.exports = { sequelize, Sequelize };