const { Portofolio, SubPortofolio } = require('../models');

module.exports = {
  // Get all sub-portfolios with their parent portfolio
  getAllSubPortfolios: async (req, res) => {
    try {
      const subPortfolios = await SubPortofolio.findAll({
        include: [{
          model: Portofolio,
          as: 'portofolio',
          attributes: ['id', 'name']
        }],
        order: [['name', 'ASC']]
      });

      res.json({
        status: 'success',
        data: subPortfolios
      });
    } catch (error) {
      console.error('Get sub-portfolios error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error'
      });
    }
  },

  // Get sub-portfolios by portfolio ID
  getSubPortfoliosByPortfolioId: async (req, res) => {
    try {
      const subPortfolios = await SubPortofolio.findAll({
        where: { portofolio_id: req.params.portfolioId },
        include: [{
          model: Portofolio,
          as: 'portofolio',
          attributes: ['id', 'name']
        }],
        order: [['name', 'ASC']]
      });

      if (!subPortfolios.length) {
        return res.status(404).json({
          status: 'error',
          message: 'No sub-portfolios found for this portfolio'
        });
      }

      res.json({
        status: 'success',
        data: subPortfolios
      });
    } catch (error) {
      console.error('Get sub-portfolios by portfolio error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error'
      });
    }
  },

  // Get single sub-portfolio by ID
  getSubPortfolioById: async (req, res) => {
    try {
      const subPortfolio = await SubPortofolio.findByPk(req.params.id, {
        include: [{
          model: Portofolio,
          as: 'portofolio',
          attributes: ['id', 'name']
        }]
      });

      if (!subPortfolio) {
        return res.status(404).json({
          status: 'error',
          message: 'Sub-portfolio not found'
        });
      }

      res.json({
        status: 'success',
        data: subPortfolio
      });
    } catch (error) {
      console.error('Get sub-portfolio error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error'
      });
    }
  },

  // Create new sub-portfolio
  createSubPortfolio: async (req, res) => {
    try {
      // Validate portfolio exists
      const portfolio = await Portofolio.findByPk(req.body.portofolio_id);
      if (!portfolio) {
        return res.status(400).json({
          status: 'error',
          message: 'Portfolio not found'
        });
      }

      // Check if code already exists
      const existingCode = await SubPortofolio.findOne({ 
        where: { code: req.body.code } 
      });
      if (existingCode) {
        return res.status(400).json({
          status: 'error',
          message: 'Sub-portfolio code already exists'
        });
      }

      const subPortfolio = await SubPortofolio.create(req.body);
      
      res.status(201).json({
        status: 'success',
        data: subPortfolio
      });
    } catch (error) {
      console.error('Create sub-portfolio error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error'
      });
    }
  },

  // Update sub-portfolio
  updateSubPortfolio: async (req, res) => {
    try {
      const subPortfolio = await SubPortofolio.findByPk(req.params.id);
      if (!subPortfolio) {
        return res.status(404).json({
          status: 'error',
          message: 'Sub-portfolio not found'
        });
      }

      // If code is being updated, check if new code exists
      if (req.body.code && req.body.code !== subPortfolio.code) {
        const existingCode = await SubPortofolio.findOne({ 
          where: { code: req.body.code } 
        });
        if (existingCode) {
          return res.status(400).json({
            status: 'error',
            message: 'Sub-portfolio code already exists'
          });
        }
      }

      // If portfolio_id is being updated, validate new portfolio exists
      if (req.body.portofolio_id && req.body.portofolio_id !== subPortfolio.portofolio_id) {
        const portfolio = await Portofolio.findByPk(req.body.portofolio_id);
        if (!portfolio) {
          return res.status(400).json({
            status: 'error',
            message: 'Portfolio not found'
          });
        }
      }

      await subPortfolio.update(req.body);
      
      res.json({
        status: 'success',
        data: subPortfolio
      });
    } catch (error) {
      console.error('Update sub-portfolio error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error'
      });
    }
  },

  // Delete sub-portfolio
  deleteSubPortfolio: async (req, res) => {
    try {
      const subPortfolio = await SubPortofolio.findByPk(req.params.id);
      if (!subPortfolio) {
        return res.status(404).json({
          status: 'error',
          message: 'Sub-portfolio not found'
        });
      }

      // Check if sub-portfolio has associated services
      const servicesCount = await subPortfolio.countServices();
      if (servicesCount > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot delete sub-portfolio with associated services'
        });
      }

      await subPortfolio.destroy();
      
      res.json({
        status: 'success',
        message: 'Sub-portfolio deleted successfully'
      });
    } catch (error) {
      console.error('Delete sub-portfolio error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
};