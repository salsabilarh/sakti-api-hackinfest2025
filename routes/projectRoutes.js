const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const projectController = require('../controllers/projectController');

// Project Management Routes
router.use('/', authMiddleware.protect);
router.get('/', 
  authMiddleware.authorize('Admin', 'Staf_PDO', 'Staf_PPK', 'Manajemen_PDO', 'Manajemen_PPK'), 
  projectController.getAllProjects
);
router.put('/:id', 
  authMiddleware.authorize('Admin'), 
  projectController.updateProject
);

module.exports = router;