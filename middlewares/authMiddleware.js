const jwt = require('jsonwebtoken');
const { User, Unit } = require('../models'); // import model user
require('dotenv').config();

const authMiddleware = {
  // Protect routes - require authentication
  protect: async (req, res, next) => {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch full user from DB
      const user = await User.findByPk(decoded.id, {
        include: [{ model: Unit, as: 'unit_kerja' }]
      });

      if (!user) {
        return res.status(401).json({ message: 'User not found or unauthorized' });
      }

      req.user = user; // Simpan user lengkap ke request
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  },

  authorize: (...roles) => {
    return (req, res, next) => {
      if (req.user.role === 'Admin') return next();

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `User role ${req.user.role} is not authorized`
        });
      }
      next();
    };
  },

  // Specific role checkers
  isAdmin: (req, res, next) => {
    return authMiddleware.authorize('Admin')(req, res, next);
  },

  canManageUsers: (req, res, next) => {
    return authMiddleware.authorize('Admin')(req, res, next);
  },

  canManageServices: (req, res, next) => {
    return authMiddleware.authorize('Admin', 'Staf_SBU', 'Manajemen_SBU')(req, res, next);
  },

  canViewAll: (req, res, next) => {
    return authMiddleware.authorize(
      'Admin',
      'Staf_PDO',
      'Staf_SBU',
      'Staf_PPK',
      'Manajemen_PDO',
      'Manajemen_SBU',
      'Manajemen_PPK'
    )(req, res, next);
  }
};

module.exports = authMiddleware;
