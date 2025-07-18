// routes/index.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const jasaController = require('../controllers/jasaController');
const marketingKitController = require('../controllers/marketingKitController');
const adminController = require('../controllers/adminController');
const { verifyToken, checkRole, checkUnitKerja } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:request_id', verifyToken, checkRole(['admin']), authController.resetPassword);
router.post('/change-password', verifyToken, authController.changePassword);
router.get('/profile', verifyToken, authController.getProfile);

// User routes (admin only)
router.get('/users', verifyToken, checkRole(['admin']), userController.getAllUsers);
router.get('/waiting-users', verifyToken, checkRole(['admin']), userController.getWaitingUsers);
router.post('/approve-user/:id', verifyToken, checkRole(['admin']), userController.approveUser);
router.post('/reject-user/:id', verifyToken, checkRole(['admin']), userController.rejectUser);
router.get('/password-reset-requests', verifyToken, checkRole(['admin']), userController.getPasswordResetRequests);
router.post('/users', verifyToken, checkRole(['admin']), userController.createUser);
router.put('/users/:id', verifyToken, checkRole(['admin']), userController.updateUser);
router.delete('/users/:id', verifyToken, checkRole(['admin']), userController.deleteUser);

// Jasa routes
router.get('/jasas', verifyToken, jasaController.getAllJasas);
router.get('/jasas/:id', verifyToken, jasaController.getJasaDetails);
router.post('/jasas', verifyToken, checkRole(['admin', 'manajemen']), jasaController.createJasa);
router.put('/jasas/:id', verifyToken, checkRole(['admin', 'manajemen']), jasaController.updateJasa);
router.delete('/jasas/:id', verifyToken, checkRole(['admin', 'manajemen']), jasaController.deleteJasa);

// Marketing Kit routes
router.get('/marketing-kits', verifyToken, marketingKitController.getAllMarketingKits);
router.post('/marketing-kits', verifyToken, checkRole(['admin', 'manajemen']), upload.single('file'), marketingKitController.uploadMarketingKit);
router.post('/marketing-kits/:id/download', verifyToken, marketingKitController.downloadMarketingKit);
router.delete('/marketing-kits/:id', verifyToken, checkRole(['admin', 'manajemen']), marketingKitController.deleteMarketingKit);

// Admin dashboard routes
router.get('/admin/stats', verifyToken, checkRole(['admin']), adminController.getDashboardStats);
router.get('/admin/download-logs', verifyToken, checkRole(['admin']), adminController.getDownloadLogs);

module.exports = router;