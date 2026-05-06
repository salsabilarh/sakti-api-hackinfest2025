/**
 * utils/validators.js
 *
 * Modul validasi terpusat untuk seluruh aplikasi SAKTI.
 * Menyediakan fungsi-fungsi validasi yang dapat digunakan di semua controller.
 *
 * ============================================================
 * TUJUAN
 * ============================================================
 * [Fix N30] Menyatukan semua logika validasi di satu tempat sehingga:
 *   - Perubahan aturan validasi cukup di satu file
 *   - Pesan error konsisten di seluruh aplikasi
 *   - Mudah diperluas dengan aturan baru
 *   - Dapat diuji secara terisolasi (unit test)
 *
 * ============================================================
 * PENGGUNAAN DI CONTROLLER
 * ============================================================
 * const { isValidEmail, isStrongPassword, parsePagination } = require('../utils/validators');
 *
 * if (!isValidEmail(email)) {
 *   return res.status(400).json({ success: false, pesan: ERROR_MESSAGES.INVALID_EMAIL });
 * }
 *
 * const { limit, offset, page } = parsePagination(req.query);
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Jika aturan bisnis berubah (misal: password minimal 10 karakter),
 *   cukup modifikasi konstanta PASSWORD_MIN_LENGTH dan regex di isStrongPassword().
 * - Tambahkan unit test untuk setiap fungsi baru di __tests__/validators.test.js
 * - Gunakan ERROR_MESSAGES untuk semua response error, jangan hardcode string.
 */

// ============================================================================
// Konstanta Validasi
// ============================================================================

/** Panjang minimum password yang diizinkan (dalam karakter) */
const PASSWORD_MIN_LENGTH = 8;

/** Batas maksimum limit pagination (mencegah data dump) */
const MAX_PAGINATION_LIMIT = 100;

/** Batas minimum limit pagination */
const MIN_PAGINATION_LIMIT = 1;

/** Tahun minimal yang dianggap valid (misal untuk data historis) */
const VALID_YEAR_MIN = 1900;

/** Tahun maksimal yang dianggap valid (10 tahun ke depan) */
const VALID_YEAR_MAX = new Date().getFullYear() + 10;

// ============================================================================
// Pesan Error Standar (Gunakan di seluruh aplikasi)
// ============================================================================

const ERROR_MESSAGES = {
  // Autentikasi & Akun
  INVALID_EMAIL: 'Format email tidak valid',
  EMAIL_REQUIRED: 'Email wajib diisi',
  PASSWORD_REQUIRED: 'Password wajib diisi',
  PASSWORD_TOO_WEAK:
    `Password harus minimal ${PASSWORD_MIN_LENGTH} karakter dan mengandung huruf besar, huruf kecil, angka, dan simbol`,
  PASSWORD_MISMATCH: 'Konfirmasi password tidak cocok',
  PASSWORD_SAME_AS_OLD: 'Password baru tidak boleh sama dengan password lama',

  // Data Master (Portfolio, Sektor, Unit, dll)
  NAME_REQUIRED: 'Nama wajib diisi',
  NAME_EMPTY: 'Nama tidak boleh kosong',
  CODE_REQUIRED: 'Kode wajib diisi',
  CODE_EMPTY: 'Kode tidak boleh kosong',

  // Pagination
  INVALID_LIMIT: `Batas tampilan (limit) harus antara ${MIN_PAGINATION_LIMIT}–${MAX_PAGINATION_LIMIT}`,
  INVALID_PAGE: 'Nomor halaman tidak valid',

  // Format Data
  INVALID_UUID: 'Format ID tidak valid',
  INVALID_YEAR: `Tahun harus antara ${VALID_YEAR_MIN} dan ${VALID_YEAR_MAX}`,
  INVALID_NUMBER: 'Nilai harus berupa angka yang valid',
  NEGATIVE_NUMBER: 'Nilai tidak boleh negatif',
};

// ============================================================================
// Validator Functions
// ============================================================================

/**
 * Memvalidasi format email.
 *
 * Pola yang diterima: user@domain.tld (TLD minimal 2 karakter)
 * Pola yang ditolak: string kosong, tanpa @, tanpa domain, tanpa titik di TLD.
 *
 * Catatan: Ini hanya validasi format BUKAN verifikasi bahwa email aktif.
 *
 * @param {string} email - Alamat email yang akan divalidasi
 * @returns {boolean} true jika format email valid
 *
 * @example
 * isValidEmail('user@example.com')     // true
 * isValidEmail('user@domain.co.id')    // true
 * isValidEmail('bukan-email')          // false
 * isValidEmail('test@')                // false
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  // Format: local@domain.tld (TLD minimal 2 karakter)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Memvalidasi kekuatan password.
 *
 * Kriteria yang harus dipenuhi:
 * - Minimal 8 karakter (dikonfigurasi via PASSWORD_MIN_LENGTH)
 * - Setidaknya satu huruf kecil (a-z)
 * - Setidaknya satu huruf besar (A-Z)
 * - Setidaknya satu angka (0-9)
 * - Setidaknya satu karakter simbol (non-alfanumerik)
 *
 * @param {string} password - Password yang akan divalidasi
 * @returns {boolean} true jika password memenuhi semua kriteria
 *
 * @example
 * isStrongPassword('Password123!')  // true
 * isStrongPassword('weak')          // false
 * isStrongPassword('n0-symbol')     // false (kurang simbol)
 */
function isStrongPassword(password) {
  if (!password || typeof password !== 'string') return false;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Memvalidasi format UUID v4.
 *
 * Format yang valid: 8-4-4-4-12 karakter hexadecimal.
 * Contoh: '550e8400-e29b-41d4-a716-446655440000'
 *
 * @param {string} uuid - String UUID yang akan divalidasi
 * @returns {boolean} true jika format UUID valid
 */
function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid.trim());
}

/**
 * Memeriksa apakah nilai adalah string yang tidak kosong setelah di-trim.
 * Berguna untuk validasi field seperti name, code, dll.
 *
 * @param {any} value - Nilai yang akan diperiksa
 * @returns {boolean} true jika value adalah string dengan konten non-whitespace
 *
 * @example
 * isNonEmptyString('  Hello  ')  // true
 * isNonEmptyString('   ')        // false
 * isNonEmptyString(null)         // false
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Memvalidasi apakah nilai adalah angka positif (>= 0).
 * [Fix #12] Digunakan untuk validasi revenue di serviceController.
 *
 * @param {any} value - Nilai yang akan divalidasi
 * @returns {boolean} true jika nilai adalah angka dan >= 0
 *
 * @example
 * isPositiveNumber(100)   // true
 * isPositiveNumber(0)     // true
 * isPositiveNumber(-5)    // false
 * isPositiveNumber('abc') // false
 */
function isPositiveNumber(value) {
  const num = Number(value);
  return !isNaN(num) && num >= 0;
}

/**
 * Memvalidasi tahun berada dalam rentang yang masuk akal.
 * Rentang default: 1900 sampai (tahun sekarang + 10).
 *
 * @param {any} value - Nilai tahun (angka atau string angka)
 * @returns {boolean} true jika tahun valid
 */
function isValidYear(value) {
  const year = parseInt(value, 10);
  return !isNaN(year) && year >= VALID_YEAR_MIN && year <= VALID_YEAR_MAX;
}

/**
 * Mem-parsing dan memvalidasi parameter pagination dari query string.
 * [Fix N35] Menerapkan batas maksimum untuk mencegah data dump.
 *
 * @param {Object} query - req.query dari Express
 * @param {number} [maxLimit=MAX_PAGINATION_LIMIT] - Batas maksimum override
 * @returns {{ limit: number, page: number, offset: number }}
 *
 * @example
 * parsePagination({ page: '2', limit: '50' })
 * // → { limit: 50, page: 2, offset: 50 }
 *
 * parsePagination({ limit: '999999' })
 * // → { limit: 100, page: 1, offset: 0 }   (terbatas)
 */
function parsePagination(query, maxLimit = MAX_PAGINATION_LIMIT) {
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || 10, MIN_PAGINATION_LIMIT),
    maxLimit
  );
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;
  return { limit, page, offset };
}

/**
 * Membersihkan string dari spasi berlebih dan opsional mengubah ke lowercase.
 * Berguna untuk normalisasi input sebelum disimpan ke database.
 *
 * @param {any} value - Nilai yang akan disanitasi
 * @param {Object} [options] - Opsi sanitasi
 * @param {boolean} [options.lowercase=false] - Jika true, ubah ke lowercase
 * @returns {string|null} String yang sudah disanitasi, atau null jika input bukan string
 *
 * @example
 * sanitizeString('  Hello World  ')           // 'Hello World'
 * sanitizeString('  Jakarta  ', {lowercase: true}) // 'jakarta'
 * sanitizeString(123)                         // null
 */
function sanitizeString(value, { lowercase = false } = {}) {
  if (typeof value !== 'string') return null;
  let result = value.trim();
  if (lowercase) result = result.toLowerCase();
  return result;
}

// ============================================================================
// Ekspor Modul
// ============================================================================
module.exports = {
  // Validator Functions
  isValidEmail,
  isStrongPassword,
  isValidUUID,
  isNonEmptyString,
  isPositiveNumber,
  isValidYear,
  parsePagination,
  sanitizeString,

  // Constants for external use (e.g., in validation middleware)
  MAX_PAGINATION_LIMIT,
  MIN_PAGINATION_LIMIT,
  PASSWORD_MIN_LENGTH,
  ERROR_MESSAGES,
};