// controllers/authController.js
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { User, PasswordResetRequest } = require('../models');
// const { sendResetPasswordEmail } = require('../utils/email');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      unit_kerja_id: user.unit_kerja_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

exports.register = async (req, res) => {
  try {
    const { email, password, full_name, unit_kerja_id, role } = req.body;

    // Validasi role
    const allowedRoles = ['management', 'viewer', 'pdo'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role for self-registration' });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await argon2.hash(password);

    // Buat user baru dengan status verifikasi null (menunggu verifikasi admin)
    const user = await User.create({
      email,
      password: hashedPassword,
      full_name,
      unit_kerja_id,
      role: role || 'viewer',
      is_verified: null,
    });

    res.status(201).json({
      message: 'Registration successful. Please wait for admin verification.',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        unit_kerja_id: user.unit_kerja_id,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Cari user berdasarkan email
    const user = await User.findOne({
      where: { email },
      include: [
        {
          association: 'unit',
          attributes: ['id', 'name', 'code', 'type'],
        },
      ],
    });

    // Cek jika user tidak ditemukan
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Validasi password
    if (!user.password || typeof user.password !== 'string') {
      return res.status(401).json({ error: 'Password is missing or corrupted.' });
    }

    const isPasswordValid = await argon2.verify(user.password, password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Cek apakah user aktif
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive.' });
    }

    // Cek apakah user sudah diverifikasi (jika kamu pakai sistem verifikasi)
    if (user.is_verified === false || user.is_verified === null) {
      return res.status(403).json({ error: 'Account is not verified yet.' });
    }

    // Buat token
    const token = generateToken(user);

    // Kirim response
    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        unit: user.unit ? user.unit.name : null,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Login failed due to server error.' });
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

    res.json({
      user: {
        ...user.toJSON(),
        unit_kerja: user.unit ? user.unit.name : null,
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
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verifikasi password saat ini
    const isPasswordValid = await argon2.verify(user.password, current_password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash password baru
    const hashedPassword = await argon2.hash(new_password);

    // Update password
    await user.update({ password: hashedPassword });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update password' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

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
        reset_token_expires: { [Sequelize.Op.gt]: new Date() },
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

    // Update password reset request
    await PasswordResetRequest.update(
      { is_processed: true, processed_by: req.user.id, processed_at: new Date() },
      { where: { user_id: user.id, is_processed: false } }
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