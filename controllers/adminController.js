/**
 * controllers/adminController.js
 *
 * Mengelola operasi administrasi sistem SAKTI:
 * - Statistik dashboard
 * - Manajemen pengguna (CRUD, verifikasi, reset password)
 * - Permintaan perubahan unit kerja
 * - Log download marketing kit
 *
 * Seluruh endpoint dilindungi oleh middleware:
 *   authenticate + authorize('admin') (dipasang di routes/adminRoutes.js)
 * Oleh karena itu, tidak ada pengecekan role inline di dalam controller ini.
 *
 * @module adminController
 */

// ============================================================
// Dependencies
// ============================================================
const {
  User,
  PasswordResetRequest,
  Service,
  MarketingKit,
  DownloadLog,
  Unit,
  ChangeRequest,
  RefreshToken,
  sequelize,
} = require('../models');
const { Op } = require('sequelize');
const argon2 = require('argon2');
const crypto = require('crypto');

// ============================================================
// Constants
// ============================================================

/** Batas maksimum item per halaman (mencegah data dump) */
const MAX_PAGINATION_LIMIT = 100;

/**
 * Kolom yang diizinkan untuk sorting pada endpoint GET /api/admin/users.
 * Mencegah SQL injection melalui parameter `?sort=`.
 */
const ALLOWED_USER_SORT_FIELDS = [
  'full_name',
  'email',
  'role',
  'created_at',
  'last_login',
];

/** Status yang valid untuk permintaan perubahan unit / role */
const VALID_CHANGE_STATUSES = ['pending', 'approved', 'rejected'];

/** Regex validasi email sederhana (sesuai RFC 5322) */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================
// Helper Functions
// ============================================================

/**
 * Mendapatkan dan memvalidasi kunci enkripsi untuk temporary password.
 * Validasi dilakukan secara lazy (saat fungsi dipanggil), bukan saat module load.
 *
 * @throws {Error} Jika kunci tidak ada atau panjangnya ≠ 32 karakter.
 * @returns {string} Kunci rahasia 32 karakter.
 */
function getSecretKey() {
  const key = process.env.TEMP_PASSWORD_SECRET_KEY;
  if (!key || key.length !== 32) {
    throw new Error(
      'TEMP_PASSWORD_SECRET_KEY harus dikonfigurasi dan panjangnya tepat 32 karakter (AES-256-CBC). ' +
      'Periksa file .env Anda.'
    );
  }
  return key;
}

/**
 * Enkripsi teks menggunakan AES-256-CBC dengan IV acak.
 * Format output: `<iv_hex>:<encrypted_hex>`
 *
 * @param {string} plainText - Teks yang akan dienkripsi.
 * @returns {string} String terenkripsi dalam format iv:encrypted.
 */
function encrypt(plainText) {
  const secretKey = getSecretKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'utf-8'), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Dekripsi teks yang dienkripsi dengan fungsi `encrypt`.
 *
 * @param {string} encryptedText - String format `iv_hex:encrypted_hex`.
 * @returns {string} Teks asli (plaintext).
 * @throws {Error} Jika format tidak valid atau dekripsi gagal.
 */
function decrypt(encryptedText) {
  const secretKey = getSecretKey();
  const [ivHex, encrypted] = encryptedText.split(':');
  if (!ivHex || !encrypted) {
    throw new Error('Format enkripsi tidak valid. Data mungkin rusak.');
  }
  const iv = Buffer.from(ivHex, 'hex');
  if (iv.length !== 16) {
    throw new Error('IV (initialization vector) tidak valid. Data mungkin rusak.');
  }
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey, 'utf-8'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Parsing dan validasi parameter pagination dari query string.
 *
 * @param {Object} query - `req.query` dari Express.
 * @returns {{ limit: number, page: number, offset: number }}
 */
function parsePagination(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), MAX_PAGINATION_LIMIT);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;
  return { limit, page, offset };
}

/**
 * Validasi format email sederhana.
 *
 * @param {string} email - Alamat email yang akan divalidasi.
 * @returns {boolean}
 */
function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
}

// ============================================================
// Controllers
// ============================================================

/**
 * GET /api/admin/dashboard
 *
 * Menampilkan statistik ringkasan untuk halaman dashboard admin.
 * Semua query dijalankan secara paralel dengan `Promise.all`.
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [
      totalUsers,
      totalWaitingUsers,
      totalPendingChangeRequests,
      totalActiveUsers,
      totalDownloads,
      totalPasswordResetRequests,
    ] = await Promise.all([
      User.count({ where: { is_verified: true } }),
      User.count({ where: { is_verified: null } }),
      ChangeRequest.count({ where: { status: 'pending' } }),
      User.count({ where: { last_login: { [Op.gte]: thirtyDaysAgo } } }),
      DownloadLog.count(),
      PasswordResetRequest.count({ where: { is_processed: false } }),
    ]);

    return res.json({
      success: true,
      data: {
        total_pengguna: totalUsers,
        menunggu_verifikasi: totalWaitingUsers,
        pengguna_aktif_30_hari: totalActiveUsers,
        total_download: totalDownloads,
        permintaan_pindah: totalPendingChangeRequests,
        permintaan_reset_password: totalPasswordResetRequests,
      },
    });
  } catch (error) {
    console.error('[getDashboardStats] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil statistik dashboard',
    });
  }
};

/**
 * GET /api/admin/users
 *
 * Mengambil daftar semua pengguna dengan dukungan:
 * - Pencarian (nama/email)
 * - Filter role, unit, status aktif, status verifikasi
 * - Sorting (whitelist aman)
 * - Pagination dengan batas maksimum
 *
 * Parameter `status` (deprecated) digantikan dengan `is_active` untuk kejelasan.
 */
exports.getAllUsers = async (req, res) => {
  try {
    const {
      search,
      role,
      unit,
      status,
      verified,
      is_active: isActiveParam,
      sort = 'full_name',
      direction = 'ASC',
    } = req.query;

    // Validasi kolom sorting
    if (!ALLOWED_USER_SORT_FIELDS.includes(sort)) {
      return res.status(400).json({
        success: false,
        pesan: `Kolom pengurutan tidak valid. Pilihan: ${ALLOWED_USER_SORT_FIELDS.join(', ')}`,
      });
    }
    const safeDirection = direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const { limit, page, offset } = parsePagination(req.query);

    // Bangun filter WHERE
    const where = {};
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }
    if (role) where.role = role;
    if (unit) where.unit_kerja_id = unit;

    // Filter status aktif: prioritas is_active > status
    let activeFilter = null;
    if (isActiveParam !== undefined) {
      activeFilter = isActiveParam === 'true' || isActiveParam === true;
    } else if (status) {
      if (status.toLowerCase() === 'active') activeFilter = true;
      else if (status.toLowerCase() === 'inactive') activeFilter = false;
      else {
        return res.status(400).json({
          success: false,
          pesan: `Parameter status tidak valid. Gunakan 'active' atau 'inactive'.`,
        });
      }
    }
    if (activeFilter !== null) where.is_active = activeFilter;

    // Filter verifikasi: default tampilkan yang sudah diproses (tidak null)
    if (verified !== undefined) {
      where.is_verified = verified === 'true';
    } else {
      where.is_verified = { [Op.ne]: null };
    }

    const total = await User.count({ where });
    const users = await User.findAll({
      where,
      include: [{ model: Unit, as: 'unit', attributes: ['id', 'name', 'type'] }],
      attributes: [
        'id',
        'full_name',
        'email',
        'role',
        'is_active',
        'is_verified',
        'last_login',
        'created_at',
        [
          sequelize.literal('CASE WHEN temporary_password IS NOT NULL THEN true ELSE false END'),
          'has_temp_password',
        ],
      ],
      order: [[sort, safeDirection]],
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          halaman: page,
          limit,
          total_halaman: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[getAllUsers] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil daftar pengguna',
    });
  }
};

/**
 * GET /api/admin/waiting-users
 *
 * Daftar pengguna yang menunggu verifikasi (is_verified = null).
 * Diurutkan FIFO (created_at ASC).
 */
exports.getWaitingUsers = async (req, res) => {
  try {
    const { limit, page, offset } = parsePagination(req.query);
    const total = await User.count({ where: { is_verified: null } });
    const users = await User.findAll({
      where: { is_verified: null },
      include: [{ model: Unit, as: 'unit', attributes: ['id', 'name', 'type'] }],
      attributes: ['id', 'full_name', 'email', 'role', 'created_at'],
      order: [['created_at', 'ASC']],
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          halaman: page,
          limit,
          total_halaman: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[getWaitingUsers] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil daftar pengguna menunggu verifikasi',
    });
  }
};

/**
 * POST /api/admin/waiting-users/:id/approve
 *
 * Menyetujui pendaftaran pengguna (set is_verified = true).
 * Hanya jika status masih null.
 */
exports.approveUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, pesan: 'Pengguna tidak ditemukan' });
    }

    if (user.is_verified === true) {
      return res.status(400).json({
        success: false,
        pesan: 'Pengguna sudah diverifikasi sebelumnya. Tidak ada tindakan yang diperlukan.',
      });
    }
    if (user.is_verified === false) {
      return res.status(400).json({
        success: false,
        pesan: 'Pendaftaran pengguna ini sebelumnya sudah ditolak. Gunakan fitur pemulihan akun jika diperlukan.',
      });
    }

    await user.update({ is_verified: true });
    return res.json({
      success: true,
      pesan: `Pendaftaran ${user.full_name} berhasil disetujui. Pengguna kini dapat login.`,
    });
  } catch (error) {
    console.error('[approveUser] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal memverifikasi pengguna',
    });
  }
};

/**
 * POST /api/admin/waiting-users/:id/reject
 *
 * Menolak pendaftaran pengguna dan menghapus akun dari database.
 * Hanya jika status masih null. Dilakukan pengecekan ketergantungan data.
 * Jika user memiliki marketing kit atau layanan, penolakan dibatalkan.
 */
exports.rejectUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, pesan: 'Pengguna tidak ditemukan' });
    }

    if (user.is_verified !== null) {
      const statusLabel = user.is_verified ? 'disetujui' : 'ditolak';
      return res.status(400).json({
        success: false,
        pesan: `Pendaftaran pengguna ini sudah ${statusLabel} sebelumnya.`,
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        pesan: 'Tidak dapat menolak pendaftaran admin. Nonaktifkan akun admin melalui fitur edit user jika diperlukan.',
      });
    }

    const [relatedKits, relatedServices] = await Promise.all([
      MarketingKit.count({ where: { uploaded_by: user.id } }),
      Service.count({ where: { created_by: user.id } }),
    ]);

    if (relatedKits > 0) {
      return res.status(409).json({
        success: false,
        pesan: `Tidak dapat menolak pendaftaran karena user telah mengupload ${relatedKits} marketing kit. Hapus kit tersebut terlebih dahulu.`,
      });
    }
    if (relatedServices > 0) {
      return res.status(409).json({
        success: false,
        pesan: `Tidak dapat menolak pendaftaran karena user telah membuat ${relatedServices} layanan. Hapus layanan tersebut terlebih dahulu.`,
      });
    }

    await user.destroy();

    return res.json({
      success: true,
      pesan: `Pendaftaran ${user.full_name} ditolak dan akun telah dihapus dari sistem.`,
    });
  } catch (error) {
    console.error('[rejectUser] Error:', error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        success: false,
        pesan: 'Tidak dapat menghapus akun karena masih memiliki data terkait (misalnya log download atau permintaan reset password). Hapus data tersebut secara manual terlebih dahulu.',
      });
    }
    return res.status(500).json({
      success: false,
      pesan: 'Gagal menolak pendaftaran pengguna.',
    });
  }
};

/**
 * GET /api/admin/password-reset-requests
 *
 * Daftar permintaan reset password yang belum diproses.
 * Hanya satu permintaan terawal per user (FIFO).
 */
exports.getPasswordResetRequests = async (req, res) => {
  try {
    const { limit, page, offset } = parsePagination(req.query);

    const earliestIds = await PasswordResetRequest.findAll({
      where: { is_processed: false },
      attributes: [[sequelize.fn('MIN', sequelize.col('id')), 'min_id']],
      group: ['user_id'],
      raw: true,
    });
    const ids = earliestIds.map((r) => r.min_id);

    if (ids.length === 0) {
      return res.json({
        success: true,
        data: {
          requests: [],
          pagination: { total: 0, halaman: page, limit, total_halaman: 0 },
        },
      });
    }

    const requests = await PasswordResetRequest.findAll({
      where: { id: { [Op.in]: ids } },
      include: [
        {
          association: 'user',
          attributes: ['id', 'full_name', 'email', 'role'],
          include: [{ association: 'unit', attributes: ['id', 'name'] }],
        },
      ],
      order: [['created_at', 'ASC']],
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: {
        requests,
        pagination: {
          total: ids.length,
          halaman: page,
          limit,
          total_halaman: Math.ceil(ids.length / limit),
        },
      },
    });
  } catch (error) {
    console.error('[getPasswordResetRequests] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil daftar permintaan reset password',
    });
  }
};

/**
 * POST /api/admin/password-reset-requests/:id/reset
 *
 * Mereset password pengguna ke password acak (96-bit entropy).
 * Password sementara dienkripsi dan disimpan di temporary_password.
 * Semua refresh token direvoke (logout dari semua perangkat).
 * Semua permintaan reset pending untuk user ditandai terproses.
 */
exports.resetUserPassword = async (req, res) => {
  try {
    const request = await PasswordResetRequest.findOne({
      where: { id: req.params.id, is_processed: false },
      include: [{ association: 'user' }],
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        pesan: 'Permintaan tidak ditemukan atau sudah diproses sebelumnya',
      });
    }

    const temporaryPassword = crypto.randomBytes(12).toString('base64url');
    const hashedPassword = await argon2.hash(temporaryPassword);

    let encryptedTempPassword = null;
    try {
      encryptedTempPassword = encrypt(temporaryPassword);
    } catch (encryptError) {
      console.warn(
        '[resetUserPassword] PERINGATAN: TEMP_PASSWORD_SECRET_KEY tidak dikonfigurasi. ' +
        'temporary_password tidak akan disimpan. Kirim password via saluran lain.'
      );
    }

    await request.user.update({
      password: hashedPassword,
      temporary_password: encryptedTempPassword,
      reset_token: null,
      reset_token_expires: null,
    });

    await RefreshToken.update(
      { is_revoked: true },
      { where: { user_id: request.user.id, is_revoked: false } }
    );

    await PasswordResetRequest.update(
      {
        is_processed: true,
        processed_by: req.user.id,
        processed_at: new Date(),
      },
      { where: { user_id: request.user.id, is_processed: false } }
    );

    return res.json({
      success: true,
      pesan: `Password ${request.user.full_name} berhasil direset. Sampaikan password sementara ini kepada pengguna.`,
      data: {
        user_id: request.user.id,
        email: request.user.email,
        full_name: request.user.full_name,
        temp_password: temporaryPassword,
      },
    });
  } catch (error) {
    console.error('[resetUserPassword] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mereset password',
    });
  }
};

/**
 * GET /api/admin/users/:id/temporary-password
 *
 * Mengambil dan mendekripsi password sementara pengguna yang masih aktif (belum diganti).
 * Menggunakan `User.unscoped()` untuk mengabaikan defaultScope.
 */
exports.getTemporaryPassword = async (req, res) => {
  try {
    const user = await User.unscoped().findByPk(req.params.id, {
      attributes: ['id', 'full_name', 'email', 'temporary_password'],
    });

    if (!user) {
      return res.status(404).json({ success: false, pesan: 'Pengguna tidak ditemukan' });
    }
    if (!user.temporary_password) {
      return res.status(404).json({
        success: false,
        pesan: 'Password sementara tidak tersedia. Pengguna mungkin sudah mengganti passwordnya.',
      });
    }
    if (!user.temporary_password.includes(':')) {
      console.error(`[getTemporaryPassword] Data temporary_password user ${user.id} memiliki format tidak valid`);
      return res.status(500).json({
        success: false,
        pesan: 'Data password sementara rusak. Lakukan reset password ulang.',
      });
    }

    let decryptedPassword;
    try {
      decryptedPassword = decrypt(user.temporary_password);
    } catch (decryptError) {
      console.error('[getTemporaryPassword] Gagal dekripsi:', decryptError.message);
      return res.status(500).json({
        success: false,
        pesan: 'Gagal mendekripsi password sementara. Periksa konfigurasi TEMP_PASSWORD_SECRET_KEY.',
      });
    }

    return res.json({
      success: true,
      data: {
        user_id: user.id,
        full_name: user.full_name,
        email: user.email,
        temp_password: decryptedPassword,
      },
    });
  } catch (error) {
    console.error('[getTemporaryPassword] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil password sementara',
    });
  }
};

/**
 * GET /api/admin/change-requests
 *
 * Daftar permintaan perubahan.
 * Mendukung filter status dan pagination.
 */
exports.getChangeRequests = async (req, res) => {
  try {
    const { limit, page, offset } = parsePagination(req.query);
    const where = {};

    if (req.query.status) {
      if (!VALID_CHANGE_STATUSES.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          pesan: `Status tidak valid. Pilihan: ${VALID_CHANGE_STATUSES.join(', ')}`,
        });
      }
      where.status = req.query.status;
    }

    const { count, rows } = await ChangeRequest.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name', 'email', 'role'] },
        { model: Unit, as: 'currentUnit', attributes: ['id', 'name', 'type'] },
        { model: Unit, as: 'requestedUnit', attributes: ['id', 'name', 'type'] },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const formattedRequests = rows.map((r) => ({
      id: r.id,
      user: {
        id: r.user.id,
        full_name: r.user.full_name,
        email: r.user.email,
        role: r.user.role,
      },
      current_unit: r.currentUnit ? { id: r.currentUnit.id, name: r.currentUnit.name } : null,
      requested_unit: r.requestedUnit ? { id: r.requestedUnit.id, name: r.requestedUnit.name } : null,
      requested_role: r.requested_role,
      status: r.status,
      admin_notes: r.admin_notes,
      created_at: r.created_at,
    }));

    return res.json({
      success: true,
      data: {
        requests: formattedRequests,
        pagination: {
          total: count,
          halaman: page,
          limit,
          total_halaman: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    console.error('[getChangeRequests] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil daftar permintaan perubahan',
    });
  }
};

/**
 * PUT /api/admin/change-requests/:request_id/process
 *
 * Memproses permintaan perubahan (role dan/atau unit) dalam satu endpoint.
 * Operasi atomik menggunakan transaction.
 */
exports.processChangeRequest = async (req, res) => {
  let transaction;
  try {
    const { request_id } = req.params;
    const { action, admin_notes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        pesan: 'Tindakan tidak valid. Gunakan "approve" untuk menyetujui atau "reject" untuk menolak.',
      });
    }

    const request = await ChangeRequest.findByPk(request_id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }],
    });

    if (!request) {
      return res.status(404).json({ success: false, pesan: 'Permintaan perubahan unit tidak ditemukan' });
    }
    if (request.status !== 'pending') {
      const statusText = request.status === 'approved' ? 'disetujui' : 'ditolak';
      return res.status(400).json({
        success: false,
        pesan: `Permintaan ini sudah ${statusText} sebelumnya`,
      });
    }

    transaction = await sequelize.transaction();

    if (action === 'approve') {
      await User.update(
        { unit_kerja_id: request.requested_unit_id },
        { where: { id: request.user.id }, transaction }
      );
      await request.update(
        { status: 'approved', admin_notes: admin_notes || null },
        { transaction }
      );
      await transaction.commit();

      return res.json({
        success: true,
        pesan: `Permintaan perubahan unit ${request.user.full_name} berhasil disetujui`,
        data: {
          request_id: request.id,
          user_id: request.user.id,
          unit_baru_id: request.requested_unit_id,
        },
      });
    } else {
      await request.update(
        { status: 'rejected', admin_notes: admin_notes || null },
        { transaction }
      );
      await transaction.commit();

      return res.json({
        success: true,
        pesan: `Permintaan perubahan unit ${request.user.full_name} berhasil ditolak`,
        data: { request_id: request.id, user_id: request.user.id },
      });
    }
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('[processChangeRequest] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal memproses permintaan perubahan unit',
    });
  }
};

/**
 * PUT /api/admin/change-requests/:request_id/process
 *
 * Memproses permintaan perubahan (role dan/atau unit) dalam satu endpoint.
 * Operasi atomik menggunakan transaction.
 */
exports.processChangeRequest = async (req, res) => {
  let transaction;
  try {
    const { request_id } = req.params;
    const { action, admin_notes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, pesan: 'Tindakan tidak valid' });
    }

    const request = await ChangeRequest.findByPk(request_id, {
      include: [{ model: User, as: 'user' }],
    });
    if (!request) {
      return res.status(404).json({ success: false, pesan: 'Permintaan tidak ditemukan' });
    }
    if (request.status !== 'pending') {
      const statusText = request.status === 'approved' ? 'disetujui' : 'ditolak';
      return res.status(400).json({
        success: false,
        pesan: `Permintaan ini sudah ${statusText} sebelumnya`,
      });
    }

    transaction = await sequelize.transaction();

    if (action === 'approve') {
      const updateData = {};

      if (request.requested_unit_id && request.requested_unit_id !== request.user.unit_kerja_id) {
        const unit = await Unit.findByPk(request.requested_unit_id, { transaction });
        if (!unit) throw new Error('Unit tujuan tidak valid');
        updateData.unit_kerja_id = request.requested_unit_id;
      }

      if (request.requested_role && request.requested_role !== request.user.role) {
        if (request.requested_role === 'admin') {
          updateData.unit_kerja_id = null;
        }
        updateData.role = request.requested_role;
      }

      if (Object.keys(updateData).length > 0) {
        await request.user.update(updateData, { transaction });
      }

      await request.update({ status: 'approved', admin_notes: admin_notes || null }, { transaction });
      await transaction.commit();

      return res.json({
        success: true,
        pesan: `Permintaan ${request.user.full_name} berhasil disetujui`,
        data: { request_id, user_id: request.user.id, changes: updateData },
      });
    } else {
      await request.update({ status: 'rejected', admin_notes: admin_notes || null }, { transaction });
      await transaction.commit();
      return res.json({
        success: true,
        pesan: `Permintaan ${request.user.full_name} berhasil ditolak`,
      });
    }
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('[processChangeRequest] Error:', error);
    return res.status(500).json({ success: false, pesan: 'Gagal memproses permintaan' });
  }
};

/**
 * GET /api/admin/download-logs
 *
 * Log download marketing kit dengan dukungan pencarian.
 */
exports.getDownloadLogs = async (req, res) => {
  try {
    const { search } = req.query;
    const { limit, page, offset } = parsePagination(req.query);
    const where = {};
    const include = [
      { association: 'marketing_kit', attributes: ['id', 'name'] },
      { association: 'user', attributes: ['id', 'full_name', 'email'] },
    ];

    if (search) {
      where[Op.or] = [
        { '$marketing_kit.name$': { [Op.like]: `%${search}%` } },
        { '$user.full_name$': { [Op.like]: `%${search}%` } },
        { purpose: { [Op.like]: `%${search}%` } },
      ];
    }

    const total = await DownloadLog.count({
      where,
      include: [
        { association: 'marketing_kit', attributes: [] },
        { association: 'user', attributes: [] },
      ],
      subQuery: false,
      distinct: true,
    });

    const logs = await DownloadLog.findAll({
      where,
      include,
      order: [['created_at', 'DESC']],
      limit,
      offset,
      subQuery: false,
    });

    return res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          halaman: page,
          limit,
          total_halaman: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[getDownloadLogs] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil log download',
    });
  }
};

/**
 * POST /api/admin/users
 *
 * Admin membuat akun pengguna baru.
 * Password di-generate acak, user langsung diverifikasi.
 */
exports.createUser = async (req, res) => {
  try {
    let { full_name, email, role, unit_kerja_id } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, pesan: 'Nama lengkap wajib diisi' });
    }
    if (!email) {
      return res.status(400).json({ success: false, pesan: 'Email wajib diisi' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, pesan: 'Format email tidak valid' });
    }
    if (!role) {
      return res.status(400).json({ success: false, pesan: 'Role wajib dipilih' });
    }
    if (role !== 'admin' && !unit_kerja_id) {
      return res.status(400).json({ success: false, pesan: 'Unit kerja wajib diisi untuk role selain admin' });
    }

    if (role !== 'admin') {
      const unit = await Unit.findByPk(unit_kerja_id);
      if (!unit) {
        return res.status(404).json({ success: false, pesan: 'Unit kerja tidak ditemukan' });
      }
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, pesan: 'Email sudah terdaftar' });
    }

    const temporaryPassword = crypto.randomBytes(12).toString('base64url');
    const hashedPassword = await argon2.hash(temporaryPassword);

    let encryptedTempPassword = null;
    try {
      encryptedTempPassword = encrypt(temporaryPassword);
    } catch (encryptError) {
      console.warn('[createUser] PERINGATAN: Tidak dapat enkripsi temporary_password:', encryptError.message);
    }

    const newUser = await User.create({
      full_name: full_name.trim(),
      email,
      password: hashedPassword,
      role,
      unit_kerja_id: role === 'admin' ? null : unit_kerja_id,
      is_active: true,
      is_verified: true,
      temporary_password: encryptedTempPassword,
    });

    return res.status(201).json({
      success: true,
      pesan: 'Pengguna berhasil dibuat. Sampaikan password sementara berikut kepada pengguna.',
      data: {
        id: newUser.id,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        unit_kerja_id: newUser.unit_kerja_id,
        temp_password: temporaryPassword,
      },
    });
  } catch (err) {
    console.error('[createUser] Error:', err);
    return res.status(500).json({ success: false, pesan: 'Gagal membuat pengguna' });
  }
};

/**
 * PUT /api/admin/users/:id
 *
 * Admin memperbarui data pengguna.
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    let { email, full_name, unit_kerja_id, role, is_active, is_verified } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, pesan: 'Pengguna tidak ditemukan' });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ success: false, pesan: 'Format email tidak valid' });
    }
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(409).json({ success: false, pesan: 'Email sudah digunakan oleh pengguna lain' });
      }
    }

    if (role === 'admin') unit_kerja_id = null;

    await user.update({
      email: email !== undefined ? email : user.email,
      full_name: full_name !== undefined ? full_name.trim() : user.full_name,
      role: role !== undefined ? role : user.role,
      unit_kerja_id: unit_kerja_id !== undefined ? unit_kerja_id : user.unit_kerja_id,
      is_active: is_active !== undefined ? is_active : user.is_active,
      is_verified: is_verified !== undefined ? is_verified : user.is_verified,
    });

    if (is_active === false) {
      await RefreshToken.update(
        { is_revoked: true },
        { where: { user_id: id, is_revoked: false } }
      );
    }

    return res.json({
      success: true,
      pesan: `Data ${user.full_name} berhasil diperbarui`,
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        unit_kerja_id: user.unit_kerja_id,
        is_active: user.is_active,
        is_verified: user.is_verified,
      },
    });
  } catch (error) {
    console.error('[updateUser] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal memperbarui data pengguna',
    });
  }
};

/**
 * DELETE /api/admin/users/:id
 *
 * Menghapus pengguna secara permanen (hard delete).
 * Akan gagal jika masih ada data terkait (marketing kit, service) atau admin terakhir.
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, pesan: 'Pengguna tidak ditemukan' });
    }

    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        pesan: 'Anda tidak dapat menghapus akun Anda sendiri',
      });
    }

    if (user.role === 'admin') {
      const totalAdmin = await User.count({ where: { role: 'admin' } });
      if (totalAdmin <= 1) {
        return res.status(400).json({
          success: false,
          pesan: 'Tidak dapat menghapus satu-satunya admin sistem. Buat admin lain terlebih dahulu.',
        });
      }
    }

    await RefreshToken.update(
      { is_revoked: true },
      { where: { user_id: req.params.id } }
    );

    const [relatedKits, relatedServices] = await Promise.all([
      MarketingKit.count({ where: { uploaded_by: req.params.id } }),
      Service.count({ where: { created_by: req.params.id } }),
    ]);

    if (relatedKits > 0) {
      return res.status(409).json({
        success: false,
        pesan: `User tidak dapat dihapus karena masih memiliki ${relatedKits} data marketing kit. Hapus atau alihkan kit tersebut terlebih dahulu.`,
      });
    }
    if (relatedServices > 0) {
      return res.status(409).json({
        success: false,
        pesan: `User tidak dapat dihapus karena masih memiliki ${relatedServices} data layanan (services) yang dibuat. Hapus atau alihkan layanan tersebut terlebih dahulu.`,
      });
    }

    await user.destroy();
    return res.json({ success: true, pesan: `Pengguna ${user.full_name} berhasil dihapus` });
  } catch (error) {
    console.error('[deleteUser] Error:', error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      const match = error.parent?.sqlMessage?.match(/FOREIGN KEY \(`(\w+)`\) REFERENCES `(\w+)`/);
      const foreignTable = match ? match[2] : 'data terkait';
      return res.status(409).json({
        success: false,
        pesan: `Pengguna tidak dapat dihapus karena masih memiliki data di tabel ${foreignTable}. Hapus atau alihkan data tersebut terlebih dahulu.`,
      });
    }
    return res.status(500).json({ success: false, pesan: 'Gagal menghapus pengguna' });
  }
};