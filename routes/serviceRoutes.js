// routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadCloudinary');

// Public routes (viewer access)
router.get('/', authMiddleware.authenticate, serviceController.getAllServices);
router.get('/:id', authMiddleware.authenticate, serviceController.getServiceById);

// Protected routes (management and admin access)
router.post('/', 
  upload.single('file'), 
  authMiddleware.authenticate,
  authMiddleware.authorize('admin', 'management'), 
  serviceController.createMarketingKit
);
router.put(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin', 'management'),
  serviceController.updateService
);
router.delete(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  serviceController.deleteService
);

module.exports = router;