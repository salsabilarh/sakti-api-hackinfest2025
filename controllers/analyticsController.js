const { Deal, Project, Service, Sector } = require('../models');
const { Op } = require('sequelize');

const analyticsController = {
  // Get CRM dashboard insights
  getCrmInsights: async (req, res) => {
    try {
      // Authorization check
      if (!canViewAnalytics(req.user)) {
        return res.status(403).json({ message: 'Not authorized to view analytics' });
      }

      const where = {};
      
      // Apply unit filter for non-admin users
      if (!['Admin', 'Manajemen_PDO', 'Manajemen_PPK'].includes(req.user.role)) {
        if (['Staf_PDO', 'Staf_PPK'].includes(req.user.role)) {
          where.unit_kerja_id = req.user.unit_kerja_id;
        }
      }

      // Get pipeline total value
      const pipelineValue = await Deal.sum('value', {
        where: { ...where, stage: { [Op.not]: ['won', 'lost'] } }
      });

      // Get conversion rate (leads to projects)
      const totalLeads = await Deal.count({ where: { ...where, stage: 'lead' } });
      const convertedLeads = await Deal.count({
        where: { ...where, stage: 'won' },
        include: [{ model: Project, as: 'project', required: true }]
      });
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      // Get top sectors with highest opportunities
      const topSectors = await Deal.findAll({
        where: { ...where, stage: { [Op.not]: ['won', 'lost'] } },
        attributes: [
          'sector_id',
          [sequelize.fn('SUM', sequelize.col('value')), 'total_value']
        ],
        include: [
          { model: Sector, as: 'sector', attributes: ['name'] }
        ],
        group: ['sector_id'],
        order: [[sequelize.fn('SUM', sequelize.col('value')), 'DESC']],
        limit: 5
      });

      res.json({
        message: 'CRM insights retrieved successfully',
        insights: {
          pipelineValue: pipelineValue || 0,
          conversionRate: parseFloat(conversionRate.toFixed(2)),
          topSectors: topSectors.map(s => ({
            sector: s.sector.name,
            totalValue: s.get('total_value')
          }))
        }
      });
    } catch (error) {
      console.error('Get CRM insights error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Generate report data
  generateReport: async (req, res) => {
    try {
      // Authorization check
      if (!canGenerateReport(req.user)) {
        return res.status(403).json({ message: 'Not authorized to generate reports' });
      }

      const { type, unitId, startDate, endDate } = req.query;
      const where = {};
      
      if (unitId) where.unit_kerja_id = unitId;
      if (startDate && endDate) {
        where.created_at = { [Op.between]: [new Date(startDate), new Date(endDate)] };
      }

      let reportData;
      switch (type) {
        case 'deals':
          reportData = await generateDealsReport(where);
          break;
        case 'projects':
          reportData = await generateProjectsReport(where);
          break;
        case 'conversion':
          reportData = await generateConversionReport(where);
          break;
        default:
          return res.status(400).json({ message: 'Invalid report type' });
      }

      res.json({
        message: 'Report generated successfully',
        report: reportData
      });
    } catch (error) {
      console.error('Generate report error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

// Helper functions
function canViewAnalytics(user) {
  return [
    'Admin', 'Staf_PDO', 'Staf_SBU', 'Staf_PPK', 
    'Manajemen_PDO', 'Manajemen_SBU', 'Manajemen_PPK'
  ].includes(user.role);
}

function canGenerateReport(user) {
  return [
    'Admin', 'Manajemen_PDO', 'Manajemen_SBU', 'Manajemen_PPK'
  ].includes(user.role);
}

async function generateDealsReport(where) {
  return Deal.findAll({
    where,
    include: [
      { model: Unit, as: 'unit' },
      { model: Service, as: 'service' },
      { model: Sector, as: 'sector' }
    ],
    order: [['created_at', 'DESC']]
  });
}

async function generateProjectsReport(where) {
  return Project.findAll({
    where,
    include: [
      { model: Deal, as: 'deal' },
      { model: Unit, as: 'unit' },
      { model: Service, as: 'service' }
    ],
    order: [['start_date', 'DESC']]
  });
}

async function generateConversionReport(where) {
  // Implementation for conversion rate report
  // This would analyze deal-to-project conversion rates
}

module.exports = analyticsController;