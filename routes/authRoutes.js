const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, denyRole } = require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', authenticate, authController.getProfile);
router.put('/update-password', authenticate, authController.updatePassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Unit Change Requests (for non-admin only)
router.post(
  '/unit-change-request',
  authenticate,
  denyRole('admin'),
  authController.requestUnitChange
);

module.exports = router;
