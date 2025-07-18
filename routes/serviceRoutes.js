const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const portfolioController = require('../controllers/portofolioController');
const subPortfolioController = require('../controllers/subPortfolioController');
const sectorController = require('../controllers/sectorController');
const subSectorController = require('../controllers/subSectorController');
const marketingKitController = require('../controllers/marketingKitController');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Apply auth middleware to all routes
router.use(authMiddleware.protect);

// Sector routes
router.get('/sectors', sectorController.getAllSectors);
router.get('/sectors/:id', sectorController.getSectorById);
router.post('/sectors', sectorController.createSector);
router.put('/sectors/:id', sectorController.updateSector);
router.delete('/sectors/:id', sectorController.deleteSector);

// Sub sector routes
router.get('/sub-sectors', subSectorController.getAllSubSectors);
router.get('/sector/:sectorId/sub-sectors', subSectorController.getSubSectorsBySectorId);
router.get('/sub-sectors/:id', subSectorController.getSubSectorById);
router.post('/sub-sectors', subSectorController.createSubSector);
router.put('/sub-sectors/:id', subSectorController.updateSubSector);
router.delete('/sub-sectors/:id', subSectorController.deleteSubSector);

// Portfolio routes
router.get('/portfolios', portfolioController.getAllPortfolios);
router.post('/portfolios', portfolioController.createPortfolio);

// Sub Portfolio routes
router.get('/sub-portfolios', subPortfolioController.getAllSubPortfolios);
router.get('/portfolio/:portfolioId/sub-portfolios', subPortfolioController.getSubPortfoliosByPortfolioId);
router.get('/sub-portfolios/:id', subPortfolioController.getSubPortfolioById);
router.post('/sub-portfolios', subPortfolioController.createSubPortfolio);
router.put('/sub-portfolios/:id', subPortfolioController.updateSubPortfolio);
router.delete('/sub-portfolios/:id', subPortfolioController.deleteSubPortfolio);

// Service-sector relationship routes
// router.post('/:serviceId/sectors/:sectorId', 
//   authMiddleware.authorize('Admin', 'Staf_SBU', 'Manajemen_SBU'), 
//   serviceController.addServiceSector
// );

// Service routes
router.get('/', serviceController.getAllServices);
router.get('/:id', serviceController.getServiceDetails);

// Marketing kit routes
router.get('/marketing-kits', marketingKitController.getAllMarketingKits);

// Role-based routes
router.post('/services', authorize(['admin', 'management']), serviceController.createService);
router.put('/services/:id', authorize(['admin', 'management']), serviceController.updateService);
router.delete('/services/:id', authorize(['admin', 'management']), serviceController.deleteService);

router.post('/marketing-kits', 
  authorize(['admin', 'management']), 
  upload.single('file'), 
  marketingKitController.uploadMarketingKit
);

router.post('/marketing-kits/:id/download', 
  authorize(['admin', 'management', 'branch_management']), 
  marketingKitController.downloadMarketingKit
);

router.put('/marketing-kits/:id', 
  authorize(['admin', 'management']), 
  marketingKitController.updateMarketingKit
);

router.delete('/marketing-kits/:id', 
  authorize(['admin', 'management']), 
  marketingKitController.deleteMarketingKit
);

module.exports = router;