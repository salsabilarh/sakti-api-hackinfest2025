const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unitController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public routes (all authenticated users)
router.get('/', unitController.getAllUnits);
router.get('/:id', unitController.getUnitById);

// Protected routes (admin only)
router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  unitController.createUnit
);
router.put(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  unitController.updateUnit
);
router.delete(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  unitController.deleteUnit
);

module.exports = router;