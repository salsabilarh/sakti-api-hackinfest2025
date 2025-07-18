// routes/marketingKitRoutes.js
const express = require('express');
const router = express.Router();
const marketingKitController = require('../controllers/marketingKitController');
const authMiddleware = require('../middlewares/authMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');

// Public routes (viewer, pdo, management access)
router.get('/', authMiddleware.authenticate, marketingKitController.getAllMarketingKits);
router.get('/:id', authMiddleware.authenticate, marketingKitController.getMarketingKitById);

// Download route (all authenticated users)
router.post(
  '/:id/download',
  authMiddleware.authenticate,
  marketingKitController.downloadMarketingKit
);

// Protected routes (management and admin access)
router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin', 'management'),
  uploadMiddleware.single('file'),
  marketingKitController.uploadMarketingKit
);
router.put(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin', 'management'),
  marketingKitController.updateMarketingKit
);
router.delete(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin', 'management'),
  marketingKitController.deleteMarketingKit
);

module.exports = router;