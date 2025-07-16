const { Project, Deal, Unit, Service, Sector } = require('../models');

const projectController = {
  // Get all projects
  getAllProjects: async (req, res) => {
    try {
      const where = {};
      
      // Apply unit filter for non-admin users
      if (!['Admin', 'Manajemen_PDO', 'Manajemen_PPK'].includes(req.user.role)) {
        if (['Staf_PDO', 'Staf_PPK'].includes(req.user.role)) {
          where.unit_kerja_id = req.user.unit_kerja_id;
        } else {
          return res.status(403).json({ message: 'Not authorized to view projects' });
        }
      }

      const projects = await Project.findAll({
        where,
        include: [
          { model: Deal, as: 'deal', attributes: ['id', 'name', 'value'] },
          { model: Unit, as: 'unit', attributes: ['id', 'name'] },
          { model: Service, as: 'service', attributes: ['id', 'name'] },
          { model: Sector, as: 'sector', attributes: ['id', 'name'] }
        ],
        order: [['start_date', 'DESC']]
      });

      res.json({
        message: 'Projects retrieved successfully',
        projects,
        count: projects.length
      });
    } catch (error) {
      console.error('Get all projects error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Update project (Admin only)
  updateProject: async (req, res) => {
    try {
      if (req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Only Admin can edit projects' });
      }

      const { id } = req.params;
      const project = await Project.findByPk(id);

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      await project.update(req.body);

      res.json({
        message: 'Project updated successfully',
        project: await Project.findByPk(id, {
          include: [
            { model: Deal, as: 'deal' },
            { model: Service, as: 'service' },
            { model: Sector, as: 'sector' }
          ]
        })
      });
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

module.exports = projectController;