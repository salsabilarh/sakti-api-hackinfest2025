/**
 * middlewares/uploadCloudinary.js
 *
 * Middleware untuk menangani upload file sementara ke disk sebelum diunggah ke Cloudinary.
 * Menggunakan Multer sebagai engine upload.
 *
 * ============================================================
 * PERBAIKAN KEAMANAN & ERROR HANDLING
 * ============================================================
 * [BUG #16] Path traversal via filename:
 *   - Sebelumnya: `${Date.now()}-${file.originalname}`
 *   - Attacker bisa mengirim nama file seperti `../../config/database.js`
 *   - Solusi: sanitasi filename dengan sanitizeFilename() yang:
 *       1. Mengambil basename (membuang path)
 *       2. Menghapus karakter non-alfanumerik (kecuali -, _)
 *
 * [BUG #17] Multer error tidak tertangani dengan baik:
 *   - Sebelumnya: `cb(new Error('...'))` → Express menganggapnya error 500
 *   - Solusi: ekspor handleMulterError() sebagai middleware error handler khusus
 *   - Membedakan MulterError (400) dari error lain (500)
 *
 * ============================================================
 * PENGGUNAAN DI ROUTES
 * ============================================================
 * const upload = require('../middlewares/uploadCloudinary');
 * const { handleMulterError } = require('../middlewares/uploadCloudinary');
 *
 * // Upload multiple files
 * router.post('/', upload.array('files'), handleMulterError, controller.create);
 *
 * // Upload single file
 * router.put('/:id', upload.single('file'), handleMulterError, controller.update);
 */

// ============================================================
// Dependencies & Konfigurasi
// ============================================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/** Direktori penyimpanan sementara file upload (default: 'uploads/') */
const UPLOAD_DIR = process.env.UPLOAD_TEMP_DIR || 'uploads/';

/** Ekstensi file yang diizinkan (case-insensitive) */
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx']);

/** Ukuran maksimum file per file (10 MB) */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Maksimum jumlah file per request */
const MAX_FILE_COUNT = 10;

// ============================================================
// Inisialisasi Direktori Upload
// ============================================================

/**
 * Memastikan direktori upload tersedia.
 * Membuat direktori jika belum ada (dengan recursive = true).
 * Mencegah error ENOENT saat multer mencoba menulis file.
 */
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ============================================================
// Helper: Sanitasi Nama File
// ============================================================

/**
 * Membersihkan nama file dari karakter berbahaya dan path traversal.
 * Alur:
 *   1. Ambil basename (buang direktori) menggunakan path.basename
 *   2. Pisahkan nama dan ekstensi
 *   3. Ganti semua karakter non-alfanumerik (kecuali - dan _) dengan underscore
 *   4. Gabungkan kembali dengan ekstensi asli
 *
 * [BUG #16] Mencegah attacker menggunakan nama file seperti:
 *   '../../config/database.js' → 'database.js' setelah sanitasi
 *
 * @param {string} originalname - Nama file asli dari client
 * @returns {string} Nama file yang sudah disanitasi (aman untuk path)
 */
function sanitizeFilename(originalname) {
  // Ambil hanya nama file (buang path)
  const basename = path.basename(originalname);

  // Pisahkan nama dan ekstensi
  const ext = path.extname(basename).toLowerCase();
  const name = path.basename(basename, ext);

  // Hapus karakter berbahaya: hanya alfanumerik, strip, underscore yang dipertahankan
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');

  return `${safeName}${ext}`;
}

// ============================================================
// Konfigurasi Multer
// ============================================================

/**
 * Konfigurasi storage Multer (menyimpan ke disk sementara).
 * - destination: direktori tujuan
 * - filename: nama file unik dengan sanitasi [BUG #16]
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const safeFilename = sanitizeFilename(file.originalname);
    const uniqueFilename = `${Date.now()}-${safeFilename}`;
    cb(null, uniqueFilename);
  },
});

/**
 * Filter tipe file berdasarkan ekstensi.
 * Jika ekstensi tidak diizinkan, memanggil cb dengan MulterError yang
 * dapat ditangani oleh handleMulterError untuk respons 400.
 *
 * @param {Object} req - Express request object
 * @param {Object} file - Multer file object
 * @param {Function} cb - Callback multer
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    // Buat MulterError dengan pesan yang informatif
    const error = Object.assign(
      new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname),
      { message: `Tipe file tidak didukung: ${ext}. Hanya PDF, DOC, DOCX, PPT, PPTX yang diizinkan.` }
    );
    return cb(error, false);
  }
  cb(null, true);
};

/**
 * Instance multer yang siap digunakan.
 * - storage: konfigurasi disk storage
 * - limits: batasan ukuran dan jumlah file
 * - fileFilter: validasi ekstensi
 */
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILE_COUNT,
  },
  fileFilter,
});

// ============================================================
// Middleware: handleMulterError
// ============================================================

/**
 * handleMulterError - Middleware error handler khusus untuk Multer.
 *
 * [BUG #17] Memperbaiki masalah di mana error dari fileFilter menyebabkan
 * respons 500 Internal Server Error. Middleware ini mengintercept error
 * Multer dan mengubahnya menjadi 400 Bad Request.
 *
 * Jenis error yang ditangani:
 *   - LIMIT_FILE_SIZE      : Ukuran file melebihi batas
 *   - LIMIT_FILE_COUNT     : Melebihi jumlah maksimum file
 *   - LIMIT_UNEXPECTED_FILE: Ekstensi tidak diizinkan atau file tidak terduga
 *   - Error biasa           : Pesan error dari fileFilter
 *
 * Penggunaan di route:
 *   router.post('/', upload.array('files'), handleMulterError, controller.create);
 *
 * @param {Error} err - Error yang terjadi (dari multer atau lainnya)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function handleMulterError(err, req, res, next) {
  if (!err) return next();

  // Error dari multer itu sendiri (LIMIT_*)
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: `Ukuran file melebihi batas maksimal ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
      LIMIT_FILE_COUNT: `Terlalu banyak file. Maksimal ${MAX_FILE_COUNT} file per request.`,
      LIMIT_UNEXPECTED_FILE: err.message || 'Tipe file tidak didukung.',
    };

    return res.status(400).json({
      success: false,
      error: messages[err.code] || `Upload error: ${err.message}`,
    });
  }

  // Error dari fileFilter atau error lainnya
  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'File upload gagal',
    });
  }

  next();
}

// ============================================================
// Ekspor
// ============================================================
module.exports = upload;
module.exports.handleMulterError = handleMulterError;
module.exports.sanitizeFilename = sanitizeFilename; // untuk keperluan unit testing