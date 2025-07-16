const { Sector, SubSector } = require('../models');

module.exports = {
  // Get all sectors
  getAllSectors: async (req, res) => {
    try {
      const sectors = await Sector.findAll({
        include: [{
          model: SubSector,
          as: 'sub_sectors',
          attributes: ['id', 'code', 'name']
        }],
        order: [['code', 'ASC']]
      });
      
      res.json({
        status: 'success',
        data: sectors
      });
    } catch (error) {
      console.error('Get sectors error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error'
      });
    }
  },

  // Get single sector by ID
  getSectorById: async (req, res) => {
    try {
      const sector = await Sector.findByPk(req.params.id, {
        include: [{
          model: SubSector,
          as: 'sub_sectors',
          attributes: ['id', 'code', 'name']
        }]
      });

      if (!sector) {
        return res.status(404).json({
          status: 'error',
          message: 'Sector not found'
        });
      }

      res.json({
        status: 'success',
        data: sector
      });
    } catch (error) {
      console.error('Get sector error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error'
      });
    }
  },

  // Create new sector
  createSector: async (req, res) => {
    try {
      const { code, name } = req.body;

      // Validate required fields
      if (!code || !name) {
        return res.status(400).json({
          status: 'error',
          message: 'Code and name are required'
        });
      }

      // Check if code already exists
      const existingSector = await Sector.findOne({ where: { code } });
      if (existingSector) {
        return res.status(409).json({
          status: 'error',
          message: 'Sector code already exists'
        });
      }

      const sector = await Sector.create({ code, name });
      
      res.status(201).json({
        status: 'success',
        data: sector,
        message: 'Sector created successfully'
      });
    } catch (error) {
      console.error('Create sector error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error'
      });
    }
  },

  // Update sector
  updateSector: async (req, res) => {
    try {
      const sector = await Sector.findByPk(req.params.id);
      if (!sector) {
        return res.status(404).json({
          status: 'error',
          message: 'Sector not found'
        });
      }

      const { code, name } = req.body;

      // Validate at least one field to update
      if (!code && !name) {
        return res.status(400).json({
          status: 'error',
          message: 'At least one field (code or name) is required for update'
        });
      }

      // Check if new code already exists
      if (code && code !== sector.code) {
        const existingSector = await Sector.findOne({ where: { code } });
        if (existingSector) {
          return res.status(409).json({
            status: 'error',
            message: 'Sector code already exists'
          });
        }
      }

      await sector.update({ code, name });
      
      res.json({
        status: 'success',
        data: sector,
        message: 'Sector updated successfully'
      });
    } catch (error) {
      console.error('Update sector error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error'
      });
    }
  },

  // Delete sector
  deleteSector: async (req, res) => {
    try {
      const sector = await Sector.findByPk(req.params.id, {
        include: [{
          model: SubSector,
          as: 'sub_sectors'
        }]
      });

      if (!sector) {
        return res.status(404).json({
          status: 'error',
          message: 'Sector not found'
        });
      }

      // Check if sector has sub-sectors
      if (sector.sub_sectors && sector.sub_sectors.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot delete sector with associated sub-sectors',
          subSectorCount: sector.sub_sectors.length
        });
      }

      await sector.destroy();
      
      res.json({
        status: 'success',
        message: 'Sector deleted successfully'
      });
    } catch (error) {
      console.error('Delete sector error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
};