const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/me', authMiddleware.protect, authController.getMe);
router.get('/me', authMiddleware.protect, authController.updatePassword);

module.exports = router;