const express = require('express');
const router = express.Router();
const sectorController = require('../controllers/sectorController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public routes (all authenticated users)
router.get('/', authMiddleware.authenticate, sectorController.getAllSectors);
router.get('/:id', authMiddleware.authenticate, sectorController.getSectorById);

// Protected routes (admin + management sbu/ppk)
const accessControl = authMiddleware.authorizeAdvanced({
  roles: ['admin', 'management'],
  allowUnits: ['sbu', 'ppk'],
});

router.post('/', authMiddleware.authenticate, accessControl, sectorController.createSector);
router.put('/:id', authMiddleware.authenticate, accessControl, sectorController.updateSector);
router.delete('/:id', authMiddleware.authenticate, accessControl, sectorController.deleteSector);

// Sub sector routes
router.get(
  '/sub-sectors',
  authMiddleware.authenticate,
  accessControl,
  sectorController.getAllSubSectors
);
router.get(
  '/sub-sectors/:id',
  authMiddleware.authenticate,
  accessControl,
  sectorController.getSubSectorById
);
router.post(
  '/:sector_id/sub-sectors',
  authMiddleware.authenticate,
  accessControl,
  sectorController.createSubSector
);
router.put(
  '/:sector_id/sub-sectors/:sub_sector_id',
  authMiddleware.authenticate,
  accessControl,
  sectorController.updateSubSector
);
router.delete(
  '/:sector_id/sub-sectors/:sub_sector_id',
  authMiddleware.authenticate,
  accessControl,
  sectorController.deleteSubSector
);

module.exports = router;
