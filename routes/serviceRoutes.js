// routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Public routes (viewer access)
router.get('/', authMiddleware.authenticate, serviceController.getAllServices);
router.get('/:id', authMiddleware.authenticate, serviceController.getServiceById);

// Protected routes (management and admin access)
router.post('/import-services', 
  authMiddleware.authenticate,
  authMiddleware.authorize('admin', 'management'),
  upload.single('file'), 
  serviceController.importServices
);

router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin', 'management'),
  serviceController.createService
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