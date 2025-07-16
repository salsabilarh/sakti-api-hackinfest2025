const { User, Unit } = require('../models');

module.exports = {
  // Get only waiting verified users (admin only)
  getWaitingUsers: async (req, res) => {
    try {
      const users = await User.findAll({
        where: { is_verified: null },
        attributes: { exclude: ['password'] },
        include: [
          {
            model: Unit,
            as: 'unit_kerja',
            attributes: ['id', 'name']
          }
        ],
        order: [['created_at', 'DESC']]
      });
      
      res.json({
        success: true,
        message: 'Unverified users retrieved',
        data: users,
        count: users.length
      });
    } catch (error) {
      console.error('Get unverified users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve unverified users'
      });
    }
  },

  // Verify user (admin only)
  verifyUser: async (req, res) => {
    try {
      const { id } = req.params;

      // Find user
      const user = await User.findByPk(id, {
        include: [{
          model: Unit,
          as: 'unit_kerja',
          attributes: ['id', 'name']
        }]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if already verified
      if (user.is_verified === true) {
        return res.status(400).json({
          success: false,
          message: 'User already verified'
        });
      }

      // Verify the user
      await user.update({ is_verified: true });

      // Prepare response
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        unit_kerja: user.unit_kerja,
        is_verified: true,
        is_active: user.is_active,
        verified_at: new Date()
      };

      res.json({
        success: true,
        message: 'User verified successfully',
        data: userData
      });

    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Verification failed'
      });
    }
  },

  // Reject user (admin only)
  rejectUser: async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Jika sudah ditolak sebelumnya
      if (user.is_verified === false) {
        return res.status(400).json({
          success: false,
          message: 'User has already been rejected'
        });
      }

      // Update user menjadi ditolak (is_verified = false)
      await user.update({
        is_verified: false
      });

      res.json({
        success: true,
        message: 'User registration rejected successfully',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          is_verified: user.is_verified,
          updated_at: new Date()
        }
      });
    } catch (error) {
      console.error('Reject user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject user'
      });
    }
  }
};