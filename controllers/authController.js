/**
 * controllers/authController.js
 *
 * Mengelola seluruh alur autentikasi dan manajemen akun pengguna SAKTI:
 * - Registrasi (dengan verifikasi admin)
 * - Login (dual-token: access token pendek + refresh token)
 * - Refresh token (memperpanjang akses tanpa login ulang)
 * - Logout (satu perangkat atau semua perangkat)
 * - Profil pengguna
 * - Ganti password (user sendiri)
 * - Lupa password (membuat permintaan reset untuk diproses admin)
 * - Permintaan pindah unit kerja
 *
 * ============================================================
 * ALUR DUAL-TOKEN
 * ============================================================
 * [Login]   → access_token (15 menit) + refresh_token (7 hari)
 * [Request] → Authorization: Bearer <access_token>
 * [Expired] → POST /api/auth/refresh { refresh_token } → access_token baru
 * [Logout]  → DELETE /api/auth/logout { refresh_token } → revoke di DB
 *
 * ============================================================
 * ENVIRONMENT VARIABLES
 * ============================================================
 * JWT_SECRET                 : Secret untuk menandatangani access token
 * ACCESS_TOKEN_EXPIRES_IN    : Durasi access token (contoh: '15m', '1h')
 * REFRESH_TOKEN_EXPIRES_DAYS : Durasi refresh token dalam hari (integer)
 *
 * Catatan: Semua variabel environment dibaca melalui fungsi sanitasi
 * yang secara otomatis membuang inline comment (// atau #) dari .env.
 *
 * ============================================================
 * KEAMANAN PENTING
 * ============================================================
 * 1. Password diverifikasi SEBELUM pengecekan is_verified/is_active
 *    → Mencegah user enumeration melalui pesan error.
 * 2. Refresh token disimpan sebagai SHA-256 hash, bukan plain text.
 * 3. Semua endpoint yang membutuhkan autentikasi dilindungi oleh
 *    middleware authenticate() yang memverifikasi JWT access token.
 * 4. Logout menghapus refresh token dari DB (tidak hanya menghapus cookie).
 */

// ============================================================
// Dependencies
// ============================================================
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  User,
  Unit,
  RefreshToken,
  PasswordResetRequest,
  UnitChangeRequest,
} = require('../models');

// ============================================================
// Helper Functions: Environment Variable Sanitasi & Keamanan
// ============================================================

/**
 * Membaca dan membersihkan environment variable dari inline comment.
 *
 * Baris .env seperti: `ACCESS_TOKEN_EXPIRES_IN=15m    // comment`
 * akan dibaca oleh dotenv sebagai `"15m    // comment"` yang menyebabkan
 * jwt.sign() gagal. Fungsi ini membuang semua karakter setelah '//' atau '#'.
 *
 * @param {string} envKey   - Nama environment variable
 * @param {string} fallback - Nilai default jika tidak tersedia
 * @returns {string} Nilai bersih tanpa komentar dan spasi ekstra
 */
function readEnvDuration(envKey, fallback) {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  // Buang inline comment dan whitespace
  return raw.split('//')[0].split('#')[0].trim();
}

/**
 * Membaca environment variable sebagai integer dengan sanitasi.
 *
 * @param {string} envKey   - Nama environment variable
 * @param {number} fallback - Nilai default
 * @returns {number} Integer yang valid (atau fallback jika tidak valid)
 */
function readEnvInt(envKey, fallback) {
  const clean = readEnvDuration(envKey, String(fallback));
  const num = parseInt(clean, 10);
  return isNaN(num) || num <= 0 ? fallback : num;
}

// ============================================================
// Konfigurasi Token (dari environment dengan fallback aman)
// ============================================================

/** @constant {string} Durasi access token (contoh: '15m', '1h', '7d') */
const ACCESS_TOKEN_EXPIRES_IN = readEnvDuration('ACCESS_TOKEN_EXPIRES_IN', '15m');

/** @constant {number} Durasi refresh token dalam hari (default 7 hari) */
const REFRESH_TOKEN_EXPIRES_DAYS = readEnvInt('REFRESH_TOKEN_EXPIRES_DAYS', 7);

// ============================================================
// Helper Functions: Token Generation & Validation
// ============================================================

/**
 * Membuat JWT access token (berumur pendek).
 * Token berisi minimal `id` dan `role` untuk keperluan otorisasi.
 *
 * @param {string} userId - UUID pengguna
 * @param {string} role   - Role pengguna ('admin', 'management', 'viewer')
 * @returns {string} JWT access token
 * @throws {Error} Jika JWT_SECRET tidak dikonfigurasi
 */
function generateAccessToken(userId, role) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET tidak dikonfigurasi. Periksa file .env.');
  }
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

/**
 * Membuat pasangan refresh token (raw + hash).
 * Raw token dikirim ke client, hash disimpan di database.
 * Hash menggunakan SHA-256 satu arah sehingga jika DB bocor, token tidak bisa dipakai.
 *
 * @returns {{ rawToken: string, tokenHash: string }}
 */
function generateRefreshToken() {
  const rawToken = crypto.randomBytes(40).toString('hex'); // 80 karakter hex
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

/**
 * Menghash refresh token mentah untuk dicocokkan dengan yang tersimpan di DB.
 *
 * @param {string} rawToken - Refresh token dari client
 * @returns {string} SHA-256 hash
 */
function hashRefreshToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// ============================================================
// Helper Functions: Validasi Input
// ============================================================

/**
 * Memeriksa kekuatan password.
 * Kriteria: minimal 8 karakter, mengandung huruf besar, huruf kecil, angka, dan simbol.
 *
 * @param {string} password - Password yang akan divalidasi
 * @returns {boolean}
 */
function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);
}

/**
 * Memvalidasi format email sederhana (sesuai RFC 5322 basic).
 *
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

// ============================================================
// Helper Functions: Format Response
// ============================================================

/**
 * Membangun objek user yang aman untuk dikirim ke client.
 * Field sensitif (password, token) tidak pernah disertakan.
 *
 * @param {Object} user - Instance model User
 * @param {Object|null} unit - Instance model Unit (opsional)
 * @returns {Object}
 */
function buildUserResponse(user, unit = null) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    unit_kerja: unit ? { id: unit.id, name: unit.name } : null,
    is_verified: user.is_verified,
    is_active: user.is_active,
  };
}

// ============================================================
// Controllers
// ============================================================

/**
 * POST /api/auth/register
 *
 * Mendaftarkan akun baru.
 * Status awal: is_verified = null (menunggu persetujuan admin).
 * Role 'admin' tidak bisa didaftar melalui endpoint ini demi keamanan.
 */
exports.register = async (req, res) => {
  try {
    const { full_name, email, password, confirm_password, unit_kerja_id, role } = req.body;

    // Validasi kehadiran field
    if (!full_name || !email || !password || !confirm_password || !role) {
      return res.status(400).json({
        success: false,
        pesan: 'Nama lengkap, email, password, konfirmasi password, dan role wajib diisi',
      });
    }

    // Validasi format email
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, pesan: 'Format email tidak valid' });
    }

    // Validasi kecocokan password
    if (password !== confirm_password) {
      return res.status(400).json({ success: false, pesan: 'Konfirmasi password tidak cocok' });
    }

    // Validasi kekuatan password
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        pesan: 'Password harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, angka, dan simbol',
      });
    }

    // Cegah registrasi role admin via endpoint publik
    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        pesan: 'Pendaftaran akun Admin tidak diizinkan melalui endpoint ini',
      });
    }

    // Validasi unit kerja untuk role non-admin
    if (!unit_kerja_id) {
      return res.status(400).json({ success: false, pesan: 'Unit kerja wajib diisi' });
    }

    const unitExists = await Unit.findByPk(unit_kerja_id);
    if (!unitExists) {
      return res.status(400).json({ success: false, pesan: 'Unit kerja tidak valid' });
    }

    // Cek duplikasi email
    const existingUser = await User.findOne({ where: { email: email.trim() } });
    if (existingUser) {
      return res.status(409).json({ success: false, pesan: 'Email sudah terdaftar' });
    }

    // Hash password dan simpan user
    const hashedPassword = await argon2.hash(password);
    const newUser = await User.create({
      full_name: full_name.trim(),
      email: email.trim(),
      password: hashedPassword,
      unit_kerja_id,
      role,
      is_verified: null, // menunggu verifikasi admin
      is_active: true,
    });

    return res.status(201).json({
      success: true,
      pesan: 'Registrasi berhasil. Silakan tunggu verifikasi admin sebelum bisa login.',
      data: {
        id: newUser.id,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        unit_kerja_id: newUser.unit_kerja_id,
        is_verified: newUser.is_verified,
        dibuat_pada: newUser.created_at,
      },
    });
  } catch (error) {
    console.error('[register] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Registrasi gagal. Silakan coba lagi.',
      ...(process.env.NODE_ENV === 'development' && { detail: error.message }),
    });
  }
};

/**
 * POST /api/auth/login
 *
 * Autentikasi user dan mengembalikan access token + refresh token.
 *
 * Urutan validasi (mencegah user enumeration):
 * 1. Cek keberadaan user → pesan GENERIK
 * 2. Verifikasi password → pesan GENERIK (sama dengan langkah 1)
 * 3. Cek is_verified → pesan SPESIFIK (karena password sudah benar)
 * 4. Cek is_active → pesan SPESIFIK
 * 5. Update last_login dan generate token pair
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, pesan: 'Email dan password wajib diisi' });
    }

    // Cari user termasuk password (scope 'withPassword') dan relasi unit
    const user = await User.scope('withPassword').findOne({
      where: { email: email.trim() },
      include: [{ model: Unit, as: 'unit', attributes: ['id', 'name'] }],
    });

    // Langkah 1 & 2: Pesan generik tidak membedakan "user tidak ada" vs "password salah"
    if (!user) {
      return res.status(401).json({ success: false, pesan: 'Email atau password salah' });
    }

    const passwordValid = await argon2.verify(user.password, password);
    if (!passwordValid) {
      return res.status(401).json({ success: false, pesan: 'Email atau password salah' });
    }

    // Langkah 3 & 4: Setelah password diverifikasi, boleh kasih pesan spesifik
    if (user.is_verified !== true) {
      return res.status(403).json({
        success: false,
        pesan: 'Akun belum diverifikasi oleh admin. Silakan tunggu atau hubungi admin.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        pesan: 'Akun telah dinonaktifkan. Hubungi admin untuk informasi lebih lanjut.',
      });
    }

    // Update last_login (digunakan untuk statistik pengguna aktif)
    await user.update({ last_login: new Date() });

    // Generate token pair
    const accessToken = generateAccessToken(user.id, user.role);
    const { rawToken, tokenHash } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      token_hash: tokenHash,
      user_id: user.id,
      expires_at: expiresAt,
      is_revoked: false,
    });

    return res.json({
      success: true,
      pesan: 'Login berhasil',
      data: buildUserResponse(user, user.unit),
      access_token: accessToken,
      refresh_token: rawToken,
      expires_in: ACCESS_TOKEN_EXPIRES_IN,
    });
  } catch (error) {
    console.error('[login] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Login gagal. Silakan coba lagi.',
      ...(process.env.NODE_ENV === 'development' && { detail: error.message }),
    });
  }
};

/**
 * POST /api/auth/refresh
 *
 * Menukar refresh token yang valid dengan access token baru.
 * Tidak memerlukan access token (karena biasanya digunakan saat access token sudah expired).
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ success: false, pesan: 'Refresh token diperlukan' });
    }

    const tokenHash = hashRefreshToken(refresh_token);
    const storedToken = await RefreshToken.findOne({
      where: {
        token_hash: tokenHash,
        is_revoked: false,
        expires_at: { [Op.gt]: new Date() },
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'full_name', 'email', 'role', 'is_active', 'is_verified'],
        },
      ],
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        pesan: 'Refresh token tidak valid, sudah kedaluwarsa, atau telah direvoke. Silakan login kembali.',
      });
    }

    const { user } = storedToken;

    // Pastikan akun masih aktif dan terverifikasi
    if (!user.is_active) {
      await RefreshToken.update(
        { is_revoked: true },
        { where: { user_id: user.id } }
      );
      return res.status(403).json({
        success: false,
        pesan: 'Akun telah dinonaktifkan. Hubungi admin.',
      });
    }

    if (user.is_verified !== true) {
      return res.status(403).json({ success: false, pesan: 'Akun belum terverifikasi.' });
    }

    const newAccessToken = generateAccessToken(user.id, user.role);
    return res.json({
      success: true,
      pesan: 'Access token berhasil diperbarui',
      access_token: newAccessToken,
      expires_in: ACCESS_TOKEN_EXPIRES_IN,
    });
  } catch (error) {
    console.error('[refreshToken] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal memperbarui token. Silakan login kembali.',
      ...(process.env.NODE_ENV === 'development' && { detail: error.message }),
    });
  }
};

/**
 * DELETE /api/auth/logout
 *
 * Me-revoke satu refresh token (logout dari perangkat tertentu).
 * Memerlukan refresh_token di body request.
 */
exports.logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ success: false, pesan: 'Refresh token diperlukan untuk logout' });
    }

    const tokenHash = hashRefreshToken(refresh_token);
    await RefreshToken.update(
      { is_revoked: true },
      {
        where: {
          token_hash: tokenHash,
          user_id: req.user.id, // Keamanan ekstra: hanya revoke token milik user yang sedang login
          is_revoked: false,
        },
      }
    );

    // Selalu kembalikan sukses untuk mencegah token enumeration
    return res.json({ success: true, pesan: 'Logout berhasil' });
  } catch (error) {
    console.error('[logout] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Logout gagal. Silakan coba lagi.',
      ...(process.env.NODE_ENV === 'development' && { detail: error.message }),
    });
  }
};

/**
 * DELETE /api/auth/logout-all
 *
 * Me-revoke semua refresh token milik user yang sedang login (logout dari semua perangkat).
 */
exports.logoutAll = async (req, res) => {
  try {
    const [revokedCount] = await RefreshToken.update(
      { is_revoked: true },
      { where: { user_id: req.user.id, is_revoked: false } }
    );

    return res.json({
      success: true,
      pesan: `Logout dari semua device berhasil. ${revokedCount} sesi aktif dihentikan.`,
    });
  } catch (error) {
    console.error('[logoutAll] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Logout dari semua device gagal.',
      ...(process.env.NODE_ENV === 'development' && { detail: error.message }),
    });
  }
};

/**
 * GET /api/auth/profile
 *
 * Mengambil profil pengguna yang sedang login dari database (bukan hanya dari JWT payload).
 * Memastikan data selalu mutakhir meskipun ada perubahan setelah token diterbitkan.
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'full_name', 'email', 'role', 'last_login', 'created_at'],
      include: [{ model: Unit, as: 'unit', attributes: ['id', 'name', 'type'] }],
    });

    if (!user) {
      return res.status(404).json({ success: false, pesan: 'User tidak ditemukan' });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        unit_kerja: user.unit
          ? { id: user.unit.id, name: user.unit.name, type: user.unit.type }
          : null,
        last_login: user.last_login,
        bergabung: user.created_at,
      },
    });
  } catch (error) {
    console.error('[getProfile] Error:', error);
    return res.status(500).json({ success: false, pesan: 'Gagal mengambil profil' });
  }
};

/**
 * PUT /api/auth/update-password
 *
 * Pengguna mengganti password sendiri.
 * Setelah berhasil, semua refresh token direvoke (logout dari semua perangkat)
 * sehingga pengguna harus login ulang dengan password baru.
 */
exports.updatePassword = async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;
    const userId = req.user.id;

    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({
        success: false,
        pesan: 'Password lama, password baru, dan konfirmasi password wajib diisi',
      });
    }

    const user = await User.scope('withPassword').findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, pesan: 'User tidak ditemukan' });
    }

    // Verifikasi password lama
    if (!user.password) {
      return res.status(400).json({
        success: false,
        pesan: 'Password lama tidak tersedia. Hubungi admin untuk reset password.',
      });
    }

    const passwordValid = await argon2.verify(user.password, current_password);
    if (!passwordValid) {
      return res.status(401).json({ success: false, pesan: 'Password lama salah' });
    }

    // Cegah password baru sama dengan lama
    const sameAsOld = await argon2.verify(user.password, new_password);
    if (sameAsOld) {
      return res.status(400).json({
        success: false,
        pesan: 'Password baru tidak boleh sama dengan password lama',
      });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ success: false, pesan: 'Konfirmasi password tidak cocok' });
    }

    if (!isStrongPassword(new_password)) {
      return res.status(400).json({
        success: false,
        pesan: 'Password baru harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, angka, dan simbol',
      });
    }

    // Hash password baru dan hapus temporary_password (jika ada)
    const hashedPassword = await argon2.hash(new_password);
    await user.update({ password: hashedPassword, temporary_password: null });

    // Revoke semua refresh token → paksa login ulang di semua device
    await RefreshToken.update(
      { is_revoked: true },
      { where: { user_id: userId, is_revoked: false } }
    );

    return res.json({
      success: true,
      pesan: 'Password berhasil diperbarui. Silakan login kembali dengan password baru.',
    });
  } catch (error) {
    console.error('[updatePassword] Error:', error);
    return res.status(500).json({ success: false, pesan: 'Gagal memperbarui password' });
  }
};

/**
 * POST /api/auth/forgot-password
 *
 * Membuat permintaan reset password untuk diproses oleh admin.
 * Response sama (tidak membedakan email terdaftar atau tidak) untuk mencegah email enumeration.
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, pesan: 'Email wajib diisi' });
    }

    const user = await User.findOne({ where: { email: email.trim() } });

    // Jika user tidak ditemukan, tetap beri response sukses (pencegahan enumeration)
    if (!user) {
      return res.json({
        success: true,
        pesan: 'Permintaan reset password berhasil dikirim. Admin akan memproses dan menghubungi Anda.',
      });
    }

    // Cek apakah sudah ada permintaan pending untuk user ini
    const existingRequest = await PasswordResetRequest.findOne({
      where: { user_id: user.id, is_processed: false },
    });

    if (existingRequest) {
      return res.json({
        success: true,
        sudah_ada: true,
        pesan: 'Permintaan reset password Anda sebelumnya masih dalam antrean. Admin akan segera memprosesnya.',
      });
    }

    await PasswordResetRequest.create({ user_id: user.id });

    return res.json({
      success: true,
      pesan: 'Permintaan berhasil dikirim. Admin akan memproses dan menghubungi Anda melalui email atau saluran resmi.',
    });
  } catch (error) {
    console.error('[forgotPassword] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Terjadi kesalahan. Silakan coba lagi.',
    });
  }
};

/**
 * POST /api/auth/unit-change-request
 *
 * Pengguna (non-admin) mengajukan permintaan pindah unit kerja.
 * Hanya satu permintaan dengan status 'pending' yang diperbolehkan per user.
 * Admin akan menyetujui/menolak melalui endpoint terpisah.
 */
exports.requestUnitChange = async (req, res) => {
  try {
    const { requested_unit_id } = req.body;
    const userId = req.user.id;

    if (!requested_unit_id) {
      return res.status(400).json({ success: false, pesan: 'Unit tujuan harus dipilih' });
    }

    const user = await User.findByPk(userId, {
      include: [{ model: Unit, as: 'unit', attributes: ['id'] }],
    });

    if (!user) {
      return res.status(404).json({ success: false, pesan: 'User tidak ditemukan' });
    }

    // Cegah jika user sudah berada di unit yang sama
    if (user.unit && String(user.unit.id) === String(requested_unit_id)) {
      return res.status(400).json({ success: false, pesan: 'Anda sudah berada di unit ini' });
    }

    const requestedUnit = await Unit.findByPk(requested_unit_id);
    if (!requestedUnit) {
      return res.status(404).json({ success: false, pesan: 'Unit yang diminta tidak ditemukan' });
    }

    // Cek apakah sudah ada permintaan pending
    const existingRequest = await UnitChangeRequest.findOne({
      where: { user_id: userId, status: 'pending' },
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        pesan: 'Anda sudah memiliki permintaan perubahan unit yang sedang diproses. Tunggu hingga selesai.',
      });
    }

    const unitChangeRequest = await UnitChangeRequest.create({
      user_id: userId,
      current_unit_id: user.unit ? user.unit.id : null,
      requested_unit_id,
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      pesan: 'Permintaan perubahan unit berhasil diajukan. Admin akan memprosesnya segera.',
      data: unitChangeRequest,
    });
  } catch (error) {
    console.error('[requestUnitChange] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengajukan permintaan perubahan unit',
      ...(process.env.NODE_ENV === 'development' && { detail: error.message }),
    });
  }
};