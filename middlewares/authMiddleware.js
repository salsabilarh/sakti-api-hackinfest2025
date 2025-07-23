// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');

exports.authenticate = async (req, res, next) => {
  try {
    // Ambil token dari header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Cari user berdasarkan ID dari token
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'reset_token', 'reset_token_expires'] },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    // Cek apakah user aktif
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Simpan user di request untuk digunakan di route berikutnya
    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient privileges.' });
    }
    next();
  };
};

exports.authorizeAdvanced = ({ roles = [], allowUnits = [] }) => {
  return async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id, {
        include: ['unit'],
      });

      // Cek role
      if (!roles.includes(user.role)) {
        return res.status(403).json({ error: 'Access denied. Insufficient role.' });
      }

      // Cek unit
      if (allowUnits.length > 0 && (!user.unit || !allowUnits.includes(user.unit.type))) {
        return res.status(403).json({ error: 'Access denied. Invalid unit type.' });
      }

      req.user = user; // perbarui user dengan relasi unit
      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

exports.denyRole = (...roles) => {
  return (req, res, next) => {
    if (roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied for this role.' });
    }
    next();
  };
};

exports.unitAccess = (unitTypes) => {
  return async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id, {
        include: ['unit'],
      });

      if (!user.unit || !unitTypes.includes(user.unit.type)) {
        return res.status(403).json({ error: 'Access denied. Invalid unit type.' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Authorization failed' });
    }
  };
};