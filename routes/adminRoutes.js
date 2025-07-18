const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all routes with admin authorization
router.get('/admin/dashboard', authorize(['admin']), adminController.getDashboardStats);
router.get('/admin/users', authorize(['admin']), adminController.getAllUsers);
router.get('/admin/waiting-users', authorize(['admin']), adminController.getWaitingUsers);
router.put('/admin/waiting-users/:id', authorize(['admin']), adminController.handleUserApproval);
router.post('/admin/users', authorize(['admin']), adminController.createUser);
router.put('/admin/users/:id', authorize(['admin']), adminController.updateUser);
router.delete('/admin/users/:id', authorize(['admin']), adminController.deleteUser);
router.get('/admin/password-reset-requests', authorize(['admin']), adminController.getPasswordResetRequests);
router.put('/admin/password-reset-requests/:requestId/reset', authorize(['admin']), authController.adminResetPassword);
router.get('/admin/download-logs', authorize(['admin']), adminController.getDownloadLogs);

module.exports = router;