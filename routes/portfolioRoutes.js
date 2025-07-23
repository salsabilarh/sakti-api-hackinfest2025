const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public routes (all authenticated users)
router.get('/', authMiddleware.authenticate, portfolioController.getAllPortfolios);
router.get('/:id', authMiddleware.authenticate, portfolioController.getPortfolioById);

// Protected routes (admin + management sbu/ppk)
const accessControl = authMiddleware.authorizeAdvanced({
  roles: ['admin', 'management'],
  allowUnits: ['sbu', 'ppk'],
});

router.post('/', authMiddleware.authenticate, accessControl, portfolioController.createPortfolio);
router.put('/:id', authMiddleware.authenticate, accessControl, portfolioController.updatePortfolio);
router.delete('/:id', authMiddleware.authenticate, accessControl, portfolioController.deletePortfolio);

// Sub portfolio routes
router.post(
  '/:portfolio_id/sub-portfolios',
  authMiddleware.authenticate,
  accessControl,
  portfolioController.createSubPortfolio
);
router.put(
  '/:portfolio_id/sub-portfolios/:sub_portfolio_id',
  authMiddleware.authenticate,
  accessControl,
  portfolioController.updateSubPortfolio
);
router.delete(
  '/:portfolio_id/sub-portfolios/:sub_portfolio_id',
  authMiddleware.authenticate,
  accessControl,
  portfolioController.deleteSubPortfolio
);

module.exports = router;
