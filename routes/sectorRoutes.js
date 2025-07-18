// routes/sectorRoutes.js
const express = require('express');
const router = express.Router();
const sectorController = require('../controllers/sectorController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public routes (all authenticated users)
router.get('/', authMiddleware.authenticate, sectorController.getAllSectors);
router.get('/:id', authMiddleware.authenticate, sectorController.getSectorById);

// Protected routes (admin only)
router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  sectorController.createSector
);
router.put(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  sectorController.updateSector
);
router.delete(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  sectorController.deleteSector
);

// Sub sector routes (admin only)
router.post(
  '/:sector_id/sub-sectors',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  sectorController.createSubSector
);
router.put(
  '/:sector_id/sub-sectors/:sub_sector_id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  sectorController.updateSubSector
);
router.delete(
  '/:sector_id/sub-sectors/:sub_sector_id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  sectorController.deleteSubSector
);

module.exports = router;