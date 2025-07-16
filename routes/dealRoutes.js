const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const dealController = require('../controllers/dealController');

// Deal Management Routes
router.use('/', authMiddleware.protect);

// Get pipeline (kanban view)
router.get('/pipeline', 
  authMiddleware.authorize('Admin', 'Staf_PDO', 'Staf_PPK', 'Manajemen_PDO', 'Manajemen_PPK'), 
  dealController.getPipelineDeals
);

// Deal history and analytics
router.get('/:id/history', 
  authMiddleware.authorize('Admin', 'Staf_PDO', 'Staf_PPK', 'Manajemen_PDO', 'Manajemen_PPK'), 
  dealController.getDealHistory
);
router.get('/analytics/lost-reasons', 
  authMiddleware.authorize('Admin', 'Staf_PDO', 'Staf_PPK', 'Manajemen_PDO', 'Manajemen_PPK'), 
  dealController.getLostReasons
);

// Deal modification
router.post('/', 
  authMiddleware.authorize('Admin', 'Staf_PDO', 'Staf_PPK', 'Manajemen_PDO', 'Manajemen_PPK'), 
  dealController.createDeal
);
router.put('/:id/stage', 
  authMiddleware.authorize('Admin', 'Staf_PDO', 'Staf_PPK', 'Manajemen_PDO', 'Manajemen_PPK'), 
  dealController.updateDealStage
);

module.exports = router;