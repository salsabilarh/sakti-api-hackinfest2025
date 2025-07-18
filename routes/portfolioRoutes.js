const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public routes (all authenticated users)
router.get('/', authMiddleware.authenticate, portfolioController.getAllPortfolios);
router.get('/:id', authMiddleware.authenticate, portfolioController.getPortfolioById);

// Protected routes (admin only)
router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  portfolioController.createPortfolio
);
router.put(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  portfolioController.updatePortfolio
);
router.delete(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  portfolioController.deletePortfolio
);

// Sub portfolio routes (admin only)
router.post(
  '/:portfolio_id/sub-portfolios',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  portfolioController.createSubPortfolio
);
router.put(
  '/:portfolio_id/sub-portfolios/:sub_portfolio_id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  portfolioController.updateSubPortfolio
);
router.delete(
  '/:portfolio_id/sub-portfolios/:sub_portfolio_id',
  authMiddleware.authenticate,
  authMiddleware.authorize('admin'),
  portfolioController.deleteSubPortfolio
);

module.exports = router;