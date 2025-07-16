const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all routes with admin authorization
router.use(authMiddleware.protect);
router.use(authMiddleware.authorize('Admin'));

// Admin verification routes
router.get('/waiting-users', adminController.getWaitingUsers);
router.put('/verify-user/:id', adminController.verifyUser);
router.delete('/reject-user/:id', adminController.rejectUser);

module.exports = router;