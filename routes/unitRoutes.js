const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unitController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware.protect);

// Only allow admin and SBU management roles for unit management
router.use(authMiddleware.authorize('Admin', 'Manajemen_SBU'));

// CRUD Routes
router.post('/', unitController.createUnit);
router.get('/', unitController.getAllUnits);
router.get('/:id', unitController.getUnitById);
router.put('/:id', unitController.updateUnit);
router.delete('/:id', unitController.deleteUnit);

module.exports = router;