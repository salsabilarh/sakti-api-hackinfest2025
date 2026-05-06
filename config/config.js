/**
 * Konfigurasi Database Sequelize
 * ===============================
 * File ini mengatur koneksi ke database MySQL berdasarkan environment.
 * 
 * Cara kerja:
 * 1. Memuat environment variables dari file .env (sudah dilakukan di app.js,
 *    namun untuk keperluan migrasi CLI kita panggil dotenv lagi di sini)
 * 2. Menyediakan objek konfigurasi untuk environment: development, test, production
 * 3. Bisa menggunakan single DATABASE_URL (jika ada) atau tetap pakai variabel terpisah
 * 
 * Prioritas konfigurasi:
 * - Jika variabel DATABASE_URL ada, kita akan menggunakannya (uncomment bagian bawah)
 * - Jika tidak, menggunakan variabel DB_USER, DB_PASS, DB_NAME, DB_HOST, DB_PORT
 * 
 * Catatan untuk migration CLI:
 *   Sequelize CLI membaca file ini secara otomatis saat menjalankan perintah seperti
 *   `npx sequelize-cli db:migrate`. Pastikan environment sudah benar (NODE_ENV).
 */

require('dotenv').config();

// ============================================================
// Konfigurasi dasar per environment (menggunakan variabel terpisah)
// ============================================================
const baseConfig = {
  dialect: 'mysql',
  logging: false,            // default matikan logging; akan di-override di development
  define: {
    underscored: true,       // otomatis ubah camelCase ke snake_case di tabel & kolom
    timestamps: true,        // tambahkan created_at & updated_at
    paranoid: false,         // soft delete tidak digunakan (hard delete)
  },
};

const development = {
  ...baseConfig,
  username: process.env.DB_USER,
  password: process.env.DB_PASS || null,   // null lebih aman daripada string kosong
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  logging: console.log,      // di development tampilkan query SQL di console
};

const test = {
  ...baseConfig,
  username: process.env.DB_USER,
  password: process.env.DB_PASS || null,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  logging: false,            // test tidak perlu log query
};

const production = {
  ...baseConfig,
  username: process.env.DB_USER,
  password: process.env.DB_PASS || null,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  logging: false,            // di production log query bisa jadi beban, matikan
  pool: {                    // connection pool untuk production
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

// ============================================================
// Support untuk DATABASE_URL (single connection string)
// ============================================================
// Jika ingin menggunakan DATABASE_URL (misal dari platform seperti Heroku, Railway),
// aktifkan kode di bawah dengan mengganti seluruh objek module.exports.
// Pastikan juga variabel environment DATABASE_URL tersedia.
//
// const urlConfig = {
//   development: { use_env_variable: 'DATABASE_URL', dialect: 'mysql', ...baseConfig },
//   test: { use_env_variable: 'DATABASE_URL', dialect: 'mysql', ...baseConfig },
//   production: { use_env_variable: 'DATABASE_URL', dialect: 'mysql', ...baseConfig },
// };
// module.exports = urlConfig;

// ============================================================
// Ekspor konfigurasi berdasarkan NODE_ENV
// ============================================================
module.exports = {
  development,
  test,
  production,
};