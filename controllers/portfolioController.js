// controllers/portfolioController.js
const { Portfolio, SubPortfolio } = require('../models');

exports.getAllPortfolios = async (req, res) => {
  try {
    const portfolios = await Portfolio.findAll({
      include: [
        {
          model: SubPortfolio,
          as: 'sub_portfolios',
          attributes: ['id', 'name', 'code'],
        },
      ],
      order: [['name', 'ASC']],
    });

    res.json({ portfolios });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get portfolios' });
  }
};

exports.getPortfolioById = async (req, res) => {
  try {
    const { id } = req.params;

    const portfolio = await Portfolio.findByPk(id, {
      include: [
        {
          model: SubPortfolio,
          as: 'sub_portfolios',
          attributes: ['id', 'name', 'code'],
        },
      ],
    });

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json({ portfolio });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get portfolio details' });
  }
};

exports.createPortfolio = async (req, res) => {
  try {
    const { name } = req.body;

    // Buat portfolio baru
    const portfolio = await Portfolio.create({
      name
    });

    res.status(201).json({ portfolio });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create portfolio' });
  }
};

exports.updatePortfolio = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Cari portfolio berdasarkan ID
    const portfolio = await Portfolio.findByPk(id);
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    // Update data portfolio
    await portfolio.update({
      name: name || portfolio.name
    });

    res.json({ portfolio });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update portfolio' });
  }
};

exports.deletePortfolio = async (req, res) => {
  try {
    const { id } = req.params;

    // Cari portfolio berdasarkan ID
    const portfolio = await Portfolio.findByPk(id);
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    // Hapus portfolio
    await portfolio.destroy();

    res.json({ message: 'Portfolio deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete portfolio' });
  }
};

exports.createSubPortfolio = async (req, res) => {
  try {
    const { portfolio_id } = req.params;
    const { name, code } = req.body;

    // Cari portfolio berdasarkan ID
    const portfolio = await Portfolio.findByPk(portfolio_id);
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    // Buat sub portfolio baru
    const subPortfolio = await SubPortfolio.create({
      name,
      code,
      portfolio_id,
    });

    res.status(201).json({ sub_portfolio: subPortfolio });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create sub portfolio' });
  }
};

exports.updateSubPortfolio = async (req, res) => {
  try {
    const { portfolio_id, sub_portfolio_id } = req.params;
    const { name, code } = req.body;

    // Cari sub portfolio berdasarkan ID
    const subPortfolio = await SubPortfolio.findOne({
      where: {
        id: sub_portfolio_id,
        portfolio_id,
      },
    });

    if (!subPortfolio) {
      return res.status(404).json({ error: 'Sub portfolio not found' });
    }

    // Update data sub portfolio
    await subPortfolio.update({
      name: name || subPortfolio.name,
      code: code || subPortfolio.code,
    });

    res.json({ sub_portfolio: subPortfolio });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update sub portfolio' });
  }
};

exports.deleteSubPortfolio = async (req, res) => {
  try {
    const { portfolio_id, sub_portfolio_id } = req.params;

    // Cari sub portfolio berdasarkan ID
    const subPortfolio = await SubPortfolio.findOne({
      where: {
        id: sub_portfolio_id,
        portfolio_id,
      },
    });

    if (!subPortfolio) {
      return res.status(404).json({ error: 'Sub portfolio not found' });
    }

    // Hapus sub portfolio
    await subPortfolio.destroy();

    res.json({ message: 'Sub portfolio deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete sub portfolio' });
  }
};