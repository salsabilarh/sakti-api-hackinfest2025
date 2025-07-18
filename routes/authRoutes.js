const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);

// Authenticated routes
router.use(authenticate);

// Profile routes
router.get('/profile', authController.getProfile);
router.put('/change-password', authController.changePassword);

module.exports = router;