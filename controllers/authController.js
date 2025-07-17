const { User, Unit } = require('../models');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');

// Helper function
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

module.exports = {
  register: async (req, res) => {
    try {
      const { name, email, password, unit_kerja_id, role } = req.body;

      // Validation
      if (!name || !email || !password || !role) {
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
        name,
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
        name: newUser.name,
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
  },
  
  login: async (req, res) => {
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
          as: 'unit_kerja',
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
        unit_kerja: user.unit_kerja ? {
          id: user.unit_kerja.id,
          name: user.unit_kerja.name
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
  },

  // Get current user profile
  getMe: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password', 'unit_kerja_id'] },
        include: [{
          model: Unit,
          as: 'unit_kerja',
          attributes: ['name']
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Transformasi: ubah object unit_kerja menjadi string nama
      const response = {
        ...user.get({ plain: true }), // Konversi ke plain object
        unit_kerja: user.unit_kerja ? user.unit_kerja.name : null // Ambil hanya nama
      };

      res.json(response);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  updatePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Validasi input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password are required' });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verifikasi password lama dengan Argon2
      try {
        const isMatch = await argon2.verify(user.password, currentPassword);
        if (!isMatch) {
          return res.status(400).json({ message: 'Current password is incorrect' });
        }
      } catch (verifyError) {
        console.error('Password verification error:', verifyError);
        return res.status(500).json({ message: 'Error verifying password' });
      }

      // Hash password baru dengan Argon2
      try {
        const hashedPassword = await argon2.hash(newPassword, {
          type: argon2.argon2id, // Rekomendasi OWASP
          memoryCost: 19456,    // 19MB
          timeCost: 2,          // Iterasi
          parallelism: 1        // Threads
        });

        await user.update({ password: hashedPassword });
        
        res.json({ 
          message: 'Password updated successfully',
          success: true
        });
      } catch (hashError) {
        console.error('Hashing error:', hashError);
        res.status(500).json({ message: 'Error hashing new password' });
      }
    } catch (error) {
      console.error('Update password error:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};