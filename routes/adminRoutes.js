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
  '/',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  adminController.getAllUsers
);
router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  adminController.createUser
);
router.put(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  adminController.updateUser
);
router.delete(
  '/:id',
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

// Download logs (admin only)
router.get(
  '/download-logs',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  adminController.getDownloadLogs
);

module.exports = router;