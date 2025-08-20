// routes/marketingKitRoutes.js
const express = require('express');
const router = express.Router();
const marketingKitController = require('../controllers/marketingKitController');
const authMiddleware = require('../middlewares/authMiddleware');
const uploadMiddleware = require('../middlewares/uploadCloudinary');

// Viewer tidak boleh akses menu marketing kit
router.get(
  '/',
  authMiddleware.authenticate,
  (req, res, next) => {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Access denied for viewers' });
    }
    next();
  },
  marketingKitController.getAllMarketingKits
);

router.get(
  '/:id',
  authMiddleware.authenticate,
  (req, res, next) => {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Access denied for viewers' });
    }
    next();
  },
  marketingKitController.getMarketingKitById
);

// Download diperbolehkan semua kecuali viewer
router.post(
  '/:id/download',
  authMiddleware.authenticate,
  (req, res, next) => {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Access denied for viewers' });
    }
    next();
  },
  marketingKitController.downloadMarketingKit
);

// Tambah, edit, hapus hanya untuk admin dan management (sbu/ppk)
router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.authorizeAdvanced({ roles: ['admin', 'management'], allowUnits: ['sbu', 'ppk'] }),
  uploadMiddleware.array('file'),
  marketingKitController.createMarketingKit
);
router.put(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorizeAdvanced({ roles: ['admin', 'management'], allowUnits: ['sbu', 'ppk'] }),
  uploadMiddleware.single('file'),
  marketingKitController.updateMarketingKit
);
router.delete(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorizeAdvanced({ roles: ['admin', 'management'], allowUnits: ['sbu', 'ppk'] }),
  marketingKitController.deleteMarketingKit
);

module.exports = router;