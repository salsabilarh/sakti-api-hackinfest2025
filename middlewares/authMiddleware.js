// middleware/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config/config');

exports.verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }
  
  jwt.verify(token, config.jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    req.user = decoded;
    next();
  });
};

exports.checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};

exports.checkUnitKerja = (allowedUnits) => {
  return (req, res, next) => {
    if (!allowedUnits.includes(req.user.unit_kerja)) {
      return res.status(403).json({ message: 'Forbidden - Unit kerja not allowed' });
    }
    next();
  };
};