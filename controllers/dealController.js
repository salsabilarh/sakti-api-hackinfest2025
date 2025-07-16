const { Deal, DealHistory, Unit, User, Service, Sector, Project } = require('../models');
const { Op } = require('sequelize');

const dealController = {
  // Create new deal
  createDeal: async (req, res) => {
    try {
      const { unit_kerja_id } = req.body;
      
      // Authorization check
      if (!canManageDeal(req.user, unit_kerja_id)) {
        return res.status(403).json({ message: 'Not authorized to create deals for this unit' });
      }

      const deal = await Deal.create({
        ...req.body,
        created_by: req.user.id
      });

      res.status(201).json({
        message: 'Deal created successfully',
        deal: await Deal.findByPk(deal.id, {
          include: [
            { model: Unit, as: 'unit' },
            { model: Service, as: 'service' },
            { model: Sector, as: 'sector' }
          ]
        })
      });
    } catch (error) {
      console.error('Create deal error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Update deal stage (drag & drop kanban)
  updateDealStage: async (req, res) => {
    try {
      const { id } = req.params;
      const { stage, notes } = req.body;

      const deal = await Deal.findByPk(id);
      if (!deal) {
        return res.status(404).json({ message: 'Deal not found' });
      }

      // Authorization check
      if (!canManageDeal(req.user, deal.unit_kerja_id)) {
        return res.status(403).json({ message: 'Not authorized to update this deal' });
      }

      // Update with context for hooks
      await deal.update(
        { stage },
        { 
          context: { 
            userId: req.user.id,
            notes: notes || `Stage changed to ${stage}`
          } 
        }
      );

      // Get updated deal with relations
      const updatedDeal = await Deal.findByPk(id, {
        include: [
          { model: Unit, as: 'unit' },
          { model: Service, as: 'service' },
          { model: Sector, as: 'sector' },
          { model: DealHistory, as: 'history', limit: 5, order: [['created_at', 'DESC']] }
        ]
      });

      res.json({
        message: 'Deal stage updated successfully',
        deal: updatedDeal
      });
    } catch (error) {
      console.error('Update deal stage error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Get all deals for kanban view
  getPipelineDeals: async (req, res) => {
    try {
      const where = {};
      
      // Apply unit filter for non-admin users
      if (!['Admin', 'Manajemen_PDO', 'Manajemen_PPK'].includes(req.user.role)) {
        if (['Staf_PDO', 'Staf_PPK'].includes(req.user.role)) {
          where.unit_kerja_id = req.user.unit_kerja_id;
        } else {
          return res.status(403).json({ message: 'Not authorized to view deals' });
        }
      }

      const deals = await Deal.findAll({
        where,
        include: [
          { model: Unit, as: 'unit', attributes: ['id', 'name'] },
          { model: Service, as: 'service', attributes: ['id', 'name'] },
          { model: Sector, as: 'sector', attributes: ['id', 'name'] },
          { model: User, as: 'creator', attributes: ['id', 'name'] }
        ],
        order: [['expected_close_date', 'ASC']]
      });

      // Group by stage for kanban view
      const pipeline = {
        lead: deals.filter(d => d.stage === 'lead'),
        contacted: deals.filter(d => d.stage === 'contacted'),
        proposal_sent: deals.filter(d => d.stage === 'proposal_sent'),
        tender: deals.filter(d => d.stage === 'tender'),
        won: deals.filter(d => d.stage === 'won'),
        lost: deals.filter(d => d.stage === 'lost')
      };

      res.json({
        message: 'Pipeline deals retrieved successfully',
        pipeline
      });
    } catch (error) {
      console.error('Get pipeline deals error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Get deal history
  getDealHistory: async (req, res) => {
    try {
      const { id } = req.params;
      const deal = await Deal.findByPk(id);

      if (!deal) {
        return res.status(404).json({ message: 'Deal not found' });
      }

      // Authorization check
      if (!canViewDeal(req.user, deal.unit_kerja_id)) {
        return res.status(403).json({ message: 'Not authorized to view this deal' });
      }

      const history = await DealHistory.findAll({
        where: { deal_id: id },
        include: [
          { model: User, as: 'changedBy', attributes: ['id', 'name'] }
        ],
        order: [['created_at', 'DESC']]
      });

      res.json({
        message: 'Deal history retrieved',
        history
      });
    } catch (error) {
      console.error('Get deal history error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Get lost reasons analytics
  getLostReasons: async (req, res) => {
    try {
      // Authorization check
      if (!canViewAnalytics(req.user)) {
        return res.status(403).json({ message: 'Not authorized to view analytics' });
      }

      const lostDeals = await Deal.findAll({
        where: { stage: 'lost', lost_reason: { [Op.not]: null } },
        attributes: ['lost_reason'],
        group: ['lost_reason'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 5
      });

      res.json({
        message: 'Top lost reasons retrieved',
        lostReasons: lostDeals.map(d => d.lost_reason)
      });
    } catch (error) {
      console.error('Get lost reasons error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

// Authorization helpers
function canManageDeal(user, unitId) {
  if (user.role === 'Admin') return true;
  if (['Manajemen_PDO', 'Manajemen_PPK'].includes(user.role)) return true;
  if (['Staf_PDO', 'Staf_PPK'].includes(user.role) && user.unit_kerja_id === unitId) return true;
  return false;
}

function canViewDeal(user, unitId) {
  if (user.role === 'Admin') return true;
  if (['Manajemen_PDO', 'Manajemen_PPK', 'Staf_PDO', 'Staf_PPK'].includes(user.role)) {
    return user.unit_kerja_id === unitId;
  }
  return false;
}

function canViewAnalytics(user) {
  return [
    'Admin', 'Staf_PDO', 'Staf_SBU', 'Staf_PPK', 
    'Manajemen_PDO', 'Manajemen_SBU', 'Manajemen_PPK'
  ].includes(user.role);
}

module.exports = dealController;