const express = require('express');
const { 
  protect,
  canManageUsers
} = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');

const router = express.Router();

// User Management Routes (Admin only)
router.use('/', protect, canManageUsers);
router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.post('/:id/reset-password', userController.resetPassword);
router.delete('/:id', userController.deleteUser);

module.exports = router;