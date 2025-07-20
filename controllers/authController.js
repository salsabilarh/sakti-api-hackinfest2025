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

exports.register = async (req, res) => {
  try {
    const { full_name, email, password, unit_kerja_id, role } = req.body;

    // Validation
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, email, password, and role are required' 
      });
    }

    // Prevent self-registration as admin
    if (role === 'Admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Admin registration is not allowed' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already registered' 
      });
    }

    // Validate unit if provided
    if (unit_kerja_id) {
      const unitExists = await Unit.findByPk(unit_kerja_id);
      if (!unitExists) {
        return res.status(400).json({
          success: false,
          message: 'Invalid unit specified'
        });
      }
    }

    // Hash password
    const hashedPassword = await argon2.hash(password);

    // Create unverified user
    const newUser = await User.create({
      full_name,
      email,
      password: hashedPassword,
      unit_kerja_id: unit_kerja_id || null,
      role,
      is_verified: null, // Explicitly set to null
      is_active: true
    });

    // Prepare response
    const userData = {
      id: newUser.id,
      name: newUser.full_name,
      email: newUser.email,
      role: newUser.role,
      unit_kerja_id: newUser.unit_kerja_id,
      is_verified: newUser.is_verified,
      is_active: newUser.is_active,
      created_at: newUser.created_at
    };

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please wait for admin verification.',
      data: userData
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Registration failed',
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
    const { current_password, new_password } = req.body;

    const user = await User.scope('withPassword').findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cek apakah password lama tersedia
    if (!user.password || user.password.trim() === '') {
      return res.status(400).json({ error: 'Password lama tidak tersedia, tidak dapat diverifikasi' });
    }

    // Verifikasi password lama
    const isPasswordValid = await argon2.verify(user.password, current_password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Password lama salah' });
    }

    // Hash password baru
    const hashedPassword = await argon2.hash(new_password);

    // Update password
    await user.update({ password: hashedPassword });

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
    const { token, new_password } = req.body;

    // Verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);

    // Cari user berdasarkan ID dari token
    const user = await User.findOne({
      where: {
        id: decoded.id,
        reset_token: token,
        reset_token_expires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Hash password baru
    const hashedPassword = await argon2.hash(new_password);

    // Update password dan hapus token
    await user.update({
      password: hashedPassword,
      reset_token: null,
      reset_token_expires: null,
    });

    // Update password reset request (tanpa req.user.id karena user belum login)
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

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Failed to reset password' });
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