// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

// Dashboard stats (admin only)
router.get(
  '/dashboard',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  adminController.getDashboardStats
);

// User management (admin only)
router.get(
  '/users',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  adminController.getAllUsers
);

// Ambil password sementara user (admin only)
router.get(
  '/users/:id/temporary-password',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  adminController.getTemporaryPassword
);

router.post(
  '/users',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  adminController.createUser
);
router.put(
  '/users/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  adminController.updateUser
);
router.delete(
  '/users/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  adminController.deleteUser
);

// Waiting users (admin only)
router.get(
  '/waiting-users',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  adminController.getWaitingUsers
);
router.post(
  '/waiting-users/:id/approve',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  adminController.approveUser
);
router.post(
  '/waiting-users/:id/reject',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  adminController.rejectUser
);

// Password reset requests (admin only)
router.get(
  '/password-reset-requests',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  adminController.getPasswordResetRequests
);
router.post(
  '/password-reset-requests/:id/reset',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  adminController.resetUserPassword
);

// Unit Change
router.get('/unit-change-requests', authMiddleware.authenticate, authMiddleware.authorize('admin'), adminController.getUnitChangeRequests);
router.put('/unit-change-requests/:request_id/process', authMiddleware.authenticate, authMiddleware.authorize('admin'), adminController.processUnitChangeRequest);

// Download logs (admin only)
router.get(
  '/download-logs',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  adminController.getDownloadLogs
);

module.exports = router;