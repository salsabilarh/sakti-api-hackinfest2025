// =============================================================================
// middlewares/authMiddleware.js
// =============================================================================
// Menyediakan middleware untuk autentikasi JWT dan otorisasi berbasis role/unit.
//
// Daftar middleware yang diekspor:
//   authenticate        - Memverifikasi JWT dan mengisi req.user
//   authorize           - Membatasi akses berdasarkan role (whitelist)
//   authorizeAdvanced   - Membatasi akses berdasarkan role + tipe unit
//   denyRole            - Memblokir role tertentu (kebalikan dari authorize)
//   unitAccess          - Membatasi akses berdasarkan tipe unit saja (tanpa cek role)
// =============================================================================

const jwt = require('jsonwebtoken');
const { User } = require('../models');

// =============================================================================
// Helper: Ambil token dari header Authorization
// =============================================================================

/**
 * Mengekstrak token JWT dari header Authorization.
 * Format yang didukung: "Bearer <token>"
 *
 * @param {Object} headers - Headers dari request Express
 * @returns {string|null} Token jika ditemukan, null jika tidak
 */
function extractToken(headers) {
  const authHeader = headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
}

// =============================================================================
// Middleware: authenticate
// =============================================================================

/**
 * authenticate - Middleware autentikasi utama.
 *
 * Memverifikasi JWT dari header Authorization, memastikan user masih aktif
 * dan ada di database, lalu menyimpan data user ke `req.user`.
 *
 * Alur:
 *   1. Ekstrak token dari header
 *   2. Verifikasi signature dan masa berlaku JWT
 *   3. Ambil data user dari database (kecuali field sensitif)
 *   4. Cek apakah user masih ada dan aktif
 *   5. Simpan user ke req.user, lanjut ke middleware berikutnya
 *
 * Jika terjadi error (token tidak ada, tidak valid, kadaluwarsa, user tidak aktif),
 * middleware akan mengembalikan response 401/403 yang sesuai.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req.headers);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Akses ditolak. Token tidak ditemukan.',
      });
    }

    // Pastikan JWT_SECRET tersedia (defensive check)
    if (!process.env.JWT_SECRET) {
      console.error('[authenticate] JWT_SECRET tidak dikonfigurasi');
      return res.status(500).json({
        success: false,
        error: 'Konfigurasi server tidak lengkap. Hubungi administrator.',
      });
    }

    // Verifikasi token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, error: 'Token tidak valid.' });
      }
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Token sudah kedaluwarsa. Silakan login kembali.' });
      }
      throw jwtError;
    }

    // Ambil data user dari database (pastikan masih ada dan aktif)
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'reset_token', 'reset_token_expires'] },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Token tidak valid. Pengguna tidak ditemukan.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Akun telah dinonaktifkan. Hubungi administrator.',
      });
    }

    // Simpan user ke request untuk digunakan oleh middleware/controller selanjutnya
    req.user = user;
    next();
  } catch (error) {
    console.error('[authenticate] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Autentikasi gagal karena kesalahan server.',
    });
  }
};

// =============================================================================
// Middleware: authorize (Role-based)
// =============================================================================

/**
 * authorize - Middleware otorisasi berbasis role (whitelist).
 *
 * Membatasi akses hanya untuk role yang tercantum dalam parameter.
 * Penggunaan: `authorize('admin', 'management')`
 *
 * @param {...string} roles - Daftar role yang diizinkan
 * @returns {Function} Middleware Express
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Akses ditolak. Role yang diizinkan: ${roles.join(', ')}`,
      });
    }
    next();
  };
};

// =============================================================================
// Middleware: authorizeAdvanced (Role + Unit Type)
// =============================================================================

/**
 * authorizeAdvanced - Middleware otorisasi kombinasi role dan tipe unit kerja.
 *
 * Aturan:
 *   - Role 'admin' selalu diizinkan (tidak dicek unit.type)
 *   - Role lain harus memiliki unit kerja dengan tipe yang termasuk dalam `allowUnits`
 *
 * Performa: Melakukan query tambahan ke database untuk mengambil relasi unit.
 * Jika menjadi bottleneck, pertimbangkan menyimpan unit.type di payload JWT.
 *
 * @param {Object} options - Opsi konfigurasi
 * @param {string[]} options.roles - Daftar role yang diizinkan
 * @param {string[]} options.allowUnits - Daftar tipe unit yang diizinkan (untuk role non-admin)
 * @returns {Function} Middleware Express async
 */
exports.authorizeAdvanced = ({ roles = [], allowUnits = [] }) => {
  return async (req, res, next) => {
    try {
      // Ambil user beserta relasi unit-nya
      const user = await User.findByPk(req.user.id, { include: ['unit'] });
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Pengguna tidak ditemukan. Silakan login kembali.',
        });
      }

      // Cek role
      if (!roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: `Akses ditolak. Role yang diizinkan: ${roles.join(', ')}`,
        });
      }

      // Admin tidak perlu dicek unit.type
      if (user.role !== 'admin' && allowUnits.length > 0) {
        const userUnitType = user.unit?.type || null;
        if (!userUnitType || !allowUnits.includes(userUnitType)) {
          return res.status(403).json({
            success: false,
            error: `Akses ditolak. Hanya unit dengan tipe ${allowUnits.join(', ')} yang diizinkan.`,
          });
        }
      }

      // Update req.user dengan data unit yang sudah di-load
      req.user = user;
      next();
    } catch (error) {
      console.error('[authorizeAdvanced] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Pemeriksaan otorisasi gagal karena kesalahan server.',
      });
    }
  };
};

// =============================================================================
// Middleware: denyRole (Blacklist Role)
// =============================================================================

/**
 * denyRole - Middleware yang memblokir akses untuk role tertentu.
 *
 * Kebalikan dari `authorize`: mengizinkan semua role kecuali yang disebutkan.
 * Penggunaan: `denyRole('viewer')` akan memblokir viewer, mengizinkan admin/management.
 *
 * @param {...string} roles - Daftar role yang DITOLAK aksesnya
 * @returns {Function} Middleware Express
 */
exports.denyRole = (...roles) => {
  return (req, res, next) => {
    if (roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Akses ditolak. Role ${req.user.role} tidak diizinkan untuk endpoint ini.`,
      });
    }
    next();
  };
};

// =============================================================================
// Middleware: unitAccess (Unit Type Only)
// =============================================================================

/**
 * unitAccess - Middleware yang membatasi akses berdasarkan tipe unit kerja (tanpa cek role).
 *
 * Berguna ketika semua role diizinkan mengakses, tetapi hanya untuk unit tertentu.
 * Penggunaan: `unitAccess(['sbu', 'ppk'])`
 *
 * @param {string[]} unitTypes - Daftar tipe unit yang diizinkan
 * @returns {Function} Middleware Express async
 */
exports.unitAccess = (unitTypes) => {
  return async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id, { include: ['unit'] });
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Pengguna tidak ditemukan. Silakan login kembali.',
        });
      }

      const userUnitType = user.unit?.type || null;
      if (!userUnitType || !unitTypes.includes(userUnitType)) {
        return res.status(403).json({
          success: false,
          error: `Akses ditolak. Hanya unit dengan tipe ${unitTypes.join(', ')} yang diizinkan.`,
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('[unitAccess] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Pemeriksaan otorisasi gagal karena kesalahan server.',
      });
    }
  };
};