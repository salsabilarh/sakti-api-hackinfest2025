const { User, Unit } = require('../models');
const argon2 = require('argon2');

module.exports = {
  // Get all users (Admin only)
  getAllUsers: async (req, res) => {
    try {
      const { is_verified } = req.query;
      
      // Siapkan kondisi where (kosong = tampilkan semua)
      const whereCondition = {};

      // Filter jika is_verified disediakan di query
      if (is_verified !== undefined) {
        if (is_verified === 'true') {
          whereCondition.is_verified = true;
        } else if (is_verified === 'false') {
          whereCondition.is_verified = false;
        }
      }

      const users = await User.findAll({
        where: whereCondition,
        attributes: [ 
          'id',
          'name',
          'email',
          'role',
          'is_verified',
          'is_active',
          'created_at',
          'updated_at'
        ],
        include: [
          { 
            model: Unit, 
            as: 'unit_kerja',
            attributes: ['id', 'name'] // Only include necessary unit fields
          }
        ],
        order: [['created_at', 'DESC']] // Sort by creation date
      });
      
      res.json({
        success: true,
        message: 'Verified users retrieved successfully',
        data: users,
        count: users.length
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve users',
        error: process.env.NODE_ENV === 'development' ? error.message : null
      });
    }
  },

  // Create new user (Admin only)
  createUser: async (req, res) => {
    try {
      const { name, email, password, unit_kerja_id, role } = req.body;

      // Validation
      if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'Name, email, password, and role are required' });
      }

      // Validate role assignment
      if (role === 'Admin' && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Only Admin can create Admin users' });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // If unit_kerja_id provided, validate unit
      if (unit_kerja_id) {
        const unit = await Unit.findByPk(unit_kerja_id);
        if (!unit) {
          return res.status(400).json({ message: 'Invalid unit' });
        }
      }

      // Hash password
      const hashedPassword = await argon2.hash(password);

      // Create user (automatically verified since admin is creating)
      const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        unit_kerja_id: unit_kerja_id || null,
        role,
        is_verified: true, // Always true when created by admin
        is_active: true,
        verified_by: req.user.id // Track which admin verified/created
      });

      // Return response without password
      const userResponse = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        unit_kerja_id: newUser.unit_kerja_id,
        is_verified: newUser.is_verified,
        is_active: newUser.is_active,
        created_at: newUser.created_at,
        verified_by: newUser.verified_by
      };

      res.status(201).json({
        message: 'User created and verified successfully',
        user: userResponse
      });

    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Update user (Admin only)
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, unit_kerja_id, role, is_active } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent non-admins from modifying admins
      if (user.role === 'Admin' && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Only Admin can modify other Admins' });
      }

      // Update fields
      user.name = name || user.name;
      user.email = email || user.email;
      user.unit_kerja_id = unit_kerja_id || user.unit_kerja_id;
      user.role = role || user.role;
      user.is_active = is_active !== undefined ? is_active : user.is_active;

      await user.save();

      // Return without password
      const userResponse = user.toJSON();
      delete userResponse.password;

      res.json({
        message: 'User updated successfully',
        user: userResponse
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Reset password (Admin only)
  resetPassword: async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const hashedPassword = await argon2.hash(newPassword);
      user.password = hashedPassword;
      await user.save();

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Delete user (Admin only)
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent deleting admin users
      if (user.role === 'Admin') {
        return res.status(403).json({ message: 'Cannot delete Admin users' });
      }

      await user.destroy();

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};