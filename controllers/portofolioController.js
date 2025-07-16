const { Portofolio, SubPortofolio } = require('../models');

module.exports = {
  // Get all portfolios with their sub-portfolios
  getAllPortfolios: async (req, res) => {
    try {
      const portfolios = await Portofolio.findAll({
        include: [{
          model: SubPortofolio,
          attributes: ['id', 'code', 'name']
        }],
        order: [['name', 'ASC']]
      });

      res.json(portfolios);
    } catch (error) {
      console.error('Get portfolios error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Create new portfolio
  createPortfolio: async (req, res) => {
    try {
      const portfolio = await Portofolio.create(req.body);
      res.status(201).json(portfolio);
    } catch (error) {
      console.error('Create portfolio error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};