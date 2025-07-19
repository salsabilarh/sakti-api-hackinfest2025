// controllers/adminController.js
const { User, PasswordResetRequest, DownloadLog, MarketingKit } = require('../models');
const { Op } = require('sequelize');
const argon2 = require('argon2');

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

    // Hitung total user yang aktif login (dalam 30 hari terakhir)
    const totalActiveUsers = await User.count({
      where: {
        last_login: {
          [Op.gte]: new Date(new Date() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Hitung total download
    const totalDownloads = await DownloadLog.count();

    res.json({
      stats: {
        total_users: totalUsers,
        total_waiting_users: totalWaitingUsers,
        total_active_users: totalActiveUsers,
        total_downloads: totalDownloads,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, unit, status, verified, page = 1, limit = 10 } = req.query;
    const where = {};
    const include = [];

    // Filter berdasarkan search
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    // Filter berdasarkan role
    if (role) {
      where.role = role;
    }

    // Filter berdasarkan status aktif
    if (status) {
      where.is_active = status === 'active';
    }

    // Filter berdasarkan verifikasi
    if (verified) {
      where.is_verified = verified === 'verified';
    }

    // Filter berdasarkan unit kerja
    if (unit) {
      include.push({
        association: 'unit',
        where: { id: unit },
        attributes: [],
      });
    }

    // Hitung total data
    const total = await User.count({
      where,
      include,
    });

    // Dapatkan data user dengan pagination
    const users = await User.findAll({
      where,
      include: [
        ...include,
        {
          association: 'unit',
          attributes: ['id', 'name'],
        },
      ],
      attributes: [
        'id',
        'full_name',
        'email',
        'role',
        'is_active',
        'is_verified',
        'last_login',
        'created_at',
      ],
      order: [['full_name', 'ASC']],
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
    res.status(500).json({ error: 'Failed to get users' });
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
    const { email, password, full_name, unit_kerja_id, role, is_active } = req.body;

    // Cek apakah email sudah terdaftar
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await argon2.hash(password);

    // Buat user baru
    const user = await User.create({
      email,
      password: hashedPassword,
      full_name,
      unit_kerja_id,
      role,
      is_active: is_active !== false,
      is_verified: true,
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        unit_kerja_id: user.unit_kerja_id,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, unit_kerja_id, role, is_active } = req.body;

    // Cari user berdasarkan ID
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update data user
    await user.update({
      email: email || user.email,
      full_name: full_name || user.full_name,
      unit_kerja_id: unit_kerja_id || user.unit_kerja_id,
      role: role || user.role,
      is_active: is_active !== undefined ? is_active : user.is_active,
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