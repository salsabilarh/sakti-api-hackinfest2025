// controllers/authController.js
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { User, Unit, PasswordResetRequest, UnitChangeRequest } = require('../models');
const { Op } = require('sequelize');
// const { sendResetPasswordEmail } = require('../utils/email');

// Helper function
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

function isStrongPassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return regex.test(password);
}

exports.register = async (req, res) => {
  try {
    const { full_name, email, password, confirm_password, unit_kerja_id, role } = req.body;

    // Validasi field wajib
    if (!full_name || !email || !password || !confirm_password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Nama lengkap, email, password, konfirmasi password, dan role wajib diisi'
      });
    }

    // Validasi kecocokan password
    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Konfirmasi password tidak cocok'
      });
    }

    // Validasi kekuatan password
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, angka, dan simbol'
      });
    }

    // Cegah pendaftaran role Admin
    if (role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Pendaftaran akun dengan role Admin tidak diizinkan'
      });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email sudah terdaftar'
      });
    }

    // Validasi unit kerja: wajib diisi untuk semua role
    if (!unit_kerja_id) {
      return res.status(400).json({
        success: false,
        message: 'Unit kerja wajib diisi'
      });
    }

    const unitExists = await Unit.findByPk(unit_kerja_id);
    if (!unitExists) {
      return res.status(400).json({
        success: false,
        message: 'Unit kerja tidak valid'
      });
    }

    // Hash password
    const hashedPassword = await argon2.hash(password);

    // Simpan user baru
    const newUser = await User.create({
      full_name,
      email,
      password: hashedPassword,
      unit_kerja_id: unit_kerja_id,
      role,
      is_verified: null,
      is_active: true
    });

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil. Silakan tunggu verifikasi admin.',
      data: {
        id: newUser.id,
        name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        unit_kerja_id: newUser.unit_kerja_id,
        is_verified: newUser.is_verified,
        is_active: newUser.is_active,
        created_at: newUser.created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registrasi gagal',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};
  
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    // Find user with unit info
    const user = await User.scope('withPassword').findOne({
      where: { email },
      include: [{
        model: Unit,
        as: 'unit',
        attributes: ['id', 'name']
      }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check verification status (must be true)
    if (user.is_verified !== true) {
      return res.status(403).json({
        success: false,
        message: 'Account not verified by admin yet'
      });
    }

    // Verify password
    const validPassword = await argon2.verify(user.password, password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.role);

    // Prepare response data
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      unit_kerja: user.unit ? {
        id: user.unit.id,
        name: user.unit.name
      } : null,
      is_verified: user.is_verified,
      is_active: user.is_active
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: userData,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'full_name', 'email', 'role', 'created_at'],
      include: [
        {
          association: 'unit',
          attributes: ['name'],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ubah response agar unit_kerja hanya menampilkan nama
    const { id, full_name, email, role, created_at, unit } = user;

    res.json({
      user: {
        id,
        full_name,
        email,
        role,
        unit_kerja: unit ? unit.name : null,
        created_at
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;

    const user = await User.scope('withPassword').findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.password || user.password.trim() === '') {
      return res.status(400).json({ error: 'Password lama tidak tersedia, tidak dapat diverifikasi' });
    }

    const isPasswordValid = await argon2.verify(user.password, current_password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Password lama salah' });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'Konfirmasi password tidak cocok' });
    }

    if (!isStrongPassword(new_password)) {
      return res.status(400).json({
        error: 'Password baru harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, angka, dan simbol'
      });
    }

    const hashedPassword = await argon2.hash(new_password);
    user.password = hashedPassword;
    user.temporary_password = null; // hapus setelah diganti manual
    await user.save();

    res.json({ message: 'Password berhasil diperbarui' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal memperbarui password' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Cari user berdasarkan email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Buat token reset password
    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_RESET_SECRET,
      { expiresIn: '1h' }
    );

    // Simpan token ke database
    await user.update({
      reset_token: resetToken,
      reset_token_expires: new Date(Date.now() + 3600000), // 1 jam dari sekarang
    });

    // Buat request reset password
    await PasswordResetRequest.create({
      user_id: user.id,
      is_processed: false,
    });

    res.json({ message: 'Password reset request submitted. Please wait for admin to process.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process forgot password request' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, new_password, confirm_password } = req.body;

    // Validasi input
    if (!token || !new_password || !confirm_password) {
      return res.status(400).json({ error: 'Token, password baru, dan konfirmasi password wajib diisi' });
    }

    // Cek password dan konfirmasi
    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'Konfirmasi password tidak cocok' });
    }

    // Validasi kekuatan password
    if (!isStrongPassword(new_password)) {
      return res.status(400).json({
        error: 'Password baru harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, angka, dan simbol'
      });
    }

    // Verifikasi JWT token reset
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);

    // Cari user yang sesuai token & belum expired
    const user = await User.findOne({
      where: {
        id: decoded.id,
        reset_token: token,
        reset_token_expires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token tidak valid atau sudah kedaluwarsa' });
    }

    // Hash dan simpan password baru
    const hashedPassword = await argon2.hash(new_password);
    await user.update({
      password: hashedPassword,
      reset_token: null,
      reset_token_expires: null,
    });

    // Update status permintaan reset
    await PasswordResetRequest.update(
      {
        is_processed: true,
        processed_by: user.id,
        processed_at: new Date(),
      },
      {
        where: {
          user_id: user.id,
          is_processed: false,
        },
      }
    );

    res.json({ message: 'Password berhasil di-reset' });

  } catch (error) {
    console.error(error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Token tidak valid' });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Token sudah kedaluwarsa' });
    }

    res.status(500).json({ error: 'Gagal me-reset password' });
  }
};

exports.requestUnitChange = async (req, res) => {
  try {
    const { requested_unit_id } = req.body;
    const userId = req.user.id;

    // Validasi input
    if (!requested_unit_id) {
      return res.status(400).json({ 
        success: false,
        message: 'Unit tujuan harus dipilih' 
      });
    }

    // Dapatkan user dengan unit saat ini
    const user = await User.findByPk(userId, {
      include: [{
        model: Unit,
        as: 'unit',
        attributes: ['id']
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Periksa apakah unit yang diminta sama dengan unit saat ini
    if (user.unit && user.unit.id === requested_unit_id) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah berada di unit ini'
      });
    }

    // Periksa apakah unit yang diminta ada
    const requestedUnit = await Unit.findByPk(requested_unit_id);
    if (!requestedUnit) {
      return res.status(404).json({
        success: false,
        message: 'Unit yang diminta tidak ditemukan'
      });
    }

    // Periksa apakah sudah ada permintaan yang pending
    const existingRequest = await UnitChangeRequest.findOne({
      where: {
        user_id: userId,
        status: 'pending'
      }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah memiliki permintaan perubahan unit yang sedang diproses'
      });
    }

    // Buat permintaan perubahan unit
    const unitChangeRequest = await UnitChangeRequest.create({
      user_id: userId,
      current_unit_id: user.unit ? user.unit.id : null,
      requested_unit_id: requested_unit_id,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Permintaan perubahan unit berhasil diajukan',
      data: unitChangeRequest
    });

  } catch (error) {
    console.error('Error in requestUnitChange:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengajukan permintaan perubahan unit',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};