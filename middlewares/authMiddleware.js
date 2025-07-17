const jwt = require('jsonwebtoken');
const { User, Unit } = require('../models'); // import model user
require('dotenv').config();

const authMiddleware = {
  // Protect routes - require authentication
  protect: async (req, res, next) => {
    try {
      let token;

      // Ambil token dari Authorization header
      if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
      ) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      // Verifikasi token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Cari user berdasarkan ID dari token
      const user = await User.findByPk(decoded.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      return res.status(401).json({ message: 'Unauthorized', error: error.message });
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
