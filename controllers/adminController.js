const { User, PasswordResetRequest, DownloadLog, Unit, UnitChangeRequest, MarketingKit } = require('../models');
const { Op } = require('sequelize');
const argon2 = require('argon2');
const crypto = require('crypto');

const secretKey = process.env.TEMP_PASSWORD_SECRET || 'default_secret_key';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'utf-8'), iv);
  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

exports.getDashboardStats = async (req, res) => {
  try {
    // Hitung total user yang sudah diverifikasi
    const totalUsers = await User.count({
      where: { is_verified: true },
    });

    // Hitung total user yang menunggu verifikasi
    const totalWaitingUsers = await User.count({
      where: { is_verified: null },
    });

    // Hitung total permintaan ganti unit yang pending
    const totalPendingUnitChangeRequests = await UnitChangeRequest.count({
      where: { status: 'pending' },
    });

    // Hitung total user aktif dalam 30 hari terakhir
    const totalActiveUsers = await User.count({
      where: {
        last_login: {
          [Op.gte]: new Date(new Date() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Hitung total download
    const totalDownloads = await DownloadLog.count();

    // Hitung total permintaan reset password yang belum diproses
    const totalPasswordResetRequests = await PasswordResetRequest.count({
      where: {
        is_processed: false, // sesuaikan nama field dan kondisi
      },
    });

    res.json({
      stats: {
        total_users: totalUsers,
        total_waiting_users: totalWaitingUsers,
        total_active_users: totalActiveUsers,
        total_downloads: totalDownloads,
        total_pending_unit_change_requests: totalPendingUnitChangeRequests,
        total_password_reset_requests: totalPasswordResetRequests, // <--- ditambahkan
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const {
      search,
      role,
      unit,
      status,
      verified,
      sort = "full_name",
      direction = "ASC",
      page = 1,
      limit = 10,
    } = req.query;

    const where = {};
    const include = [];

    // 🔍 Pencarian nama / email
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    // 🎯 Filter Role
    if (role) {
      where.role = role;
    }

    // ✅ Filter status aktif
    if (status) {
      where.is_active = status.toLowerCase() === "active";
    }

    // ✅ Filter status verifikasi
    if (verified !== undefined) {
      if (verified === "true") {
        where.is_verified = true;
      } else if (verified === "false") {
        where.is_verified = false;
      }
    } else {
      // Default: hanya user yang status verifikasi tidak null
      where.is_verified = { [Op.ne]: null };
    }

    // 🏢 Filter unit kerja (berdasarkan ID unit)
    if (unit) {
      where.unit_kerja_id = unit;
    }

    // 🔢 Hitung total
    const total = await User.count({ where });

    // 🗂 Ambil data user dengan relasi
    const users = await User.findAll({
      where,
      include: [
        {
          model: Unit,
          as: "unit",
          attributes: ["id", "name"],
        },
      ],
      attributes: [
        "id",
        "full_name",
        "email",
        "role",
        "is_active",
        "is_verified",
        "last_login",
        "created_at",
      ],
      order: [[sort, direction.toUpperCase() === "DESC" ? "DESC" : "ASC"]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error getAllUsers:", error.message, error.stack);
    return res.status(500).json({ error: error.message });
  }
};

exports.getWaitingUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Hitung total data
    const total = await User.count({
      where: { is_verified: null },
    });

    // Dapatkan data user yang menunggu verifikasi
    const users = await User.findAll({
      where: { is_verified: null },
      include: [
        {
          association: 'unit',
          attributes: ['id', 'name'],
        },
      ],
      attributes: ['id', 'full_name', 'email', 'role', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get waiting users' });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Cari user berdasarkan ID
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verifikasi user
    await user.update({ is_verified: true });

    res.json({ message: 'User approved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
};

exports.rejectUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Cari user berdasarkan ID
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Reject user
    await user.update({ is_verified: false });

    res.json({ message: 'User rejected successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject user' });
  }
};

exports.getPasswordResetRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Hitung total data
    const total = await PasswordResetRequest.count({
      where: { is_processed: false },
    });

    // Dapatkan permintaan reset password
    const requests = await PasswordResetRequest.findAll({
      where: { is_processed: false },
      include: [
        {
          association: 'user',
          attributes: ['id', 'full_name', 'email', 'role'],
          include: [
            {
              association: 'unit',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
      order: [['created_at', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({
      requests,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get password reset requests' });
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;

    // Cari permintaan reset password berdasarkan ID
    const request = await PasswordResetRequest.findOne({
      where: { id, is_processed: false },
      include: ['user'],
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }

    // Generate password default
    const defaultPassword = 'Password123!';
    const hashedPassword = await argon2.hash(defaultPassword);

    // Update password user
    await request.user.update({
      password: hashedPassword,
      reset_token: null,
      reset_token_expires: null,
    });

    // Update status permintaan reset password
    await request.update({
      is_processed: true,
      processed_by: req.user.id,
      processed_at: new Date(),
    });

    res.json({ message: 'Password reset successfully to default' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};


exports.getUnitChangeRequests = async (req, res) => {
  try {
    // Hanya admin yang bisa mengakses
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Hanya admin yang dapat melihat permintaan perubahan unit'
      });
    }

    const limit = parseInt(req.query.limit) || 5;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const { count, rows: requests } = await UnitChangeRequest.findAndCountAll({
      where: { status: 'pending' },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'full_name', 'email']
        },
        {
          model: Unit,
          as: 'currentUnit',
          attributes: ['id', 'name']
        },
        {
          model: Unit,
          as: 'requestedUnit',
          attributes: ['id', 'name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    res.json({
      success: true,
      message: 'Daftar permintaan perubahan unit',
      data: requests.map(request => ({
        id: request.id,
        user: {
          id: request.user.id,
          name: request.user.full_name,
          email: request.user.email
        },
        current_unit: request.currentUnit ? {
          id: request.currentUnit.id,
          name: request.currentUnit.name
        } : null,
        requested_unit: {
          id: request.requestedUnit.id,
          name: request.requestedUnit.name
        },
        status: request.status,
        created_at: request.created_at
      })),
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      }
    });

  } catch (error) {
    console.error('Error in getUnitChangeRequests:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan daftar permintaan perubahan unit',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

exports.processUnitChangeRequest = async (req, res) => {
  try {
    // Hanya admin yang bisa mengakses
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Hanya admin yang dapat memproses permintaan perubahan unit'
      });
    }

    const { request_id } = req.params;
    const { action, admin_notes } = req.body;

    // Validasi input
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action harus berupa "approve" atau "reject"'
      });
    }

    // Temukan permintaan
    const request = await UnitChangeRequest.findByPk(request_id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id']
        }
      ]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Permintaan perubahan unit tidak ditemukan'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Permintaan ini sudah diproses sebelumnya'
      });
    }

    // Proses permintaan
    if (action === 'approve') {
      // Update unit user
    await User.update(
      { unit_kerja_id: request.requested_unit_id },
      { where: { id: request.user.id } }
    );

      // Update status permintaan
      await request.update({
        status: 'approved',
        admin_notes: admin_notes || null
      });

      res.json({
        success: true,
        message: 'Permintaan perubahan unit disetujui',
        data: {
          request_id: request.id,
          new_unit_id: request.requested_unit_id,
          user_id: request.user.id
        }
      });
    } else {
      // Reject request
      await request.update({
        status: 'rejected',
        admin_notes: admin_notes || null
      });

      res.json({
        success: true,
        message: 'Permintaan perubahan unit ditolak',
        data: {
          request_id: request.id,
          user_id: request.user.id
        }
      });
    }

  } catch (error) {
    console.error('Error in processUnitChangeRequest:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memproses permintaan perubahan unit',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

exports.getDownloadLogs = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const where = {};
    const include = [];

    // Filter berdasarkan search
    if (search) {
      where[Op.or] = [
        { '$marketing_kit.name$': { [Op.like]: `%${search}%` } },
        { '$user.full_name$': { [Op.like]: `%${search}%` } },
        { purpose: { [Op.like]: `%${search}%` } },
      ];
    }

    // Hitung total data
    const total = await DownloadLog.count({
      where,
      include: [
        {
          association: 'marketing_kit',
          attributes: [],
        },
        {
          association: 'user',
          attributes: [],
        },
      ],
    });

    // Dapatkan log download
    const logs = await DownloadLog.findAll({
      where,
      include: [
        {
          association: 'marketing_kit',
          attributes: ['id', 'name'],
        },
        {
          association: 'user',
          attributes: ['id', 'full_name', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get download logs' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { full_name, email, role, unit_kerja_id } = req.body;

    if (!full_name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Nama lengkap, email, dan role wajib diisi',
      });
    }

    if (role !== 'viewer' && role !== 'admin') {
      if (!unit_kerja_id) {
        return res.status(400).json({
          success: false,
          message: 'Unit kerja wajib diisi untuk role selain admin dan viewer',
        });
      }

      const unit = await Unit.findByPk(unit_kerja_id);
      if (!unit) {
        return res.status(400).json({
          success: false,
          message: 'Unit kerja tidak ditemukan',
        });
      }
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email sudah terdaftar',
      });
    }

    // 🔐 Generate random password
    const generatedPassword = crypto.randomBytes(6).toString('base64'); // bisa diubah sesuai kebutuhan
    const hashedPassword = await argon2.hash(generatedPassword);
    const encryptedTempPassword = encrypt(generatedPassword);

    const newUser = await User.create({
      full_name,
      email,
      password: hashedPassword,
      role,
      unit_kerja_id: (role === 'admin' || role === 'viewer') ? null : unit_kerja_id,
      is_active: true,
      is_verified: true,
      temporary_password: encryptedTempPassword
    });

    res.status(201).json({
      success: true,
      message: 'User berhasil dibuat',
      data: {
        id: newUser.id,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        unit_kerja_id: newUser.unit_kerja_id,
        password: generatedPassword
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat user',
      error: process.env.NODE_ENV === 'development' ? err.message : null,
    });
  }
};

exports.getTemporaryPassword = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    if (!user.temporary_password) {
      return res.status(404).json({ message: "Password sementara tidak tersedia atau sudah dihapus" });
    }

    // Dekripsi
    const [ivHex, encrypted] = user.temporary_password.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey, 'utf-8'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    res.json({ password: decrypted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil password sementara" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    let { email, full_name, unit_kerja_id, role, is_active, is_verified } = req.body;

    // Cari user berdasarkan ID
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Jika role adalah admin atau viewer, maka unit_kerja_id diset null
    if (role === 'admin' || role === 'viewer') {
      unit_kerja_id = null;
    }

    // Update user hanya dengan data yang dikirim
    await user.update({
      email: email ?? user.email,
      full_name: full_name ?? user.full_name,
      role: role ?? user.role,
      unit_kerja_id,
      is_active: is_active !== undefined ? is_active : user.is_active,
      is_verified: is_verified !== undefined ? is_verified : user.is_verified,
    });

    res.json({
      message: 'User updated successfully',
      user: {
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
    console.error(error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Cari user berdasarkan ID
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hapus user
    await user.destroy();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};