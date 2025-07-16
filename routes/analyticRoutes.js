const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const analyticsController = require('../controllers/analyticsController');

// Analytics & Dashboard Routes
router.use('/', authMiddleware.protect);
router.get('/crm', 
  authMiddleware.authorize('Admin', 'Staf_PDO', 'Staf_SBU', 'Staf_PPK', 'Manajemen_PDO', 'Manajemen_SBU', 'Manajemen_PPK'), 
  analyticsController.getCrmInsights
);
router.get('/report', 
  authMiddleware.authorize('Admin', 'Manajemen_PDO', 'Manajemen_SBU', 'Manajemen_PPK'), 
  analyticsController.generateReport
);

module.exports = router;