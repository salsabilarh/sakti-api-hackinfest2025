const { Sector, SubSector } = require('../models');

module.exports = {
  // Get all sub-sectors with their parent sector
  getAllSubSectors: async (req, res) => {
    try {
      const subSectors = await SubSector.findAll({
        include: [{
          model: Sector,
          as: 'sector',
          attributes: ['id', 'code', 'name']
        }],
        order: [['name', 'ASC']]
      });

      res.json({
        status: 'success',
        data: subSectors
      });
    } catch (error) {
      console.error('Get sub-sectors error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error'
      });
    }
  },

  // Get sub-sectors by sector ID
  getSubSectorsBySectorId: async (req, res) => {
    try {
      const subSectors = await SubSector.findAll({
        where: { sector_id: req.params.sectorId },
        include: [{
          model: Sector,
          as: 'sector',
          attributes: ['id', 'code', 'name']
        }],
        order: [['name', 'ASC']]
      });

      if (!subSectors.length) {
        return res.status(404).json({
          status: 'error',
          message: 'No sub-sectors found for this sector'
        });
      }

      res.json({
        status: 'success',
        data: subSectors
      });
    } catch (error) {
      console.error('Get sub-sectors by sector error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error'
      });
    }
  },

  // Get single sub-sector by ID
  getSubSectorById: async (req, res) => {
    try {
      const subSector = await SubSector.findByPk(req.params.id, {
        include: [{
          model: Sector,
          as: 'sector',
          attributes: ['id', 'code', 'name']
        }]
      });

      if (!subSector) {
        return res.status(404).json({
          status: 'error',
          message: 'Sub-sector not found'
        });
      }

      res.json({
        status: 'success',
        data: subSector
      });
    } catch (error) {
      console.error('Get sub-sector error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error'
      });
    }
  },

  // Create new sub-sector
  createSubSector: async (req, res) => {
    try {
      // Validate request body
      if (!req.body.sector_id || !req.body.code || !req.body.name) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields: sector_id, code, and name are required'
        });
      }

      // Validate sector exists
      const sector = await Sector.findByPk(req.body.sector_id);
      if (!sector) {
        return res.status(404).json({  // Changed from 400 to 404 for "not found"
          status: 'error',
          message: 'Sector not found',
          details: `No sector found with ID: ${req.body.sector_id}`
        });
      }

      // Check if code already exists
      const existingCode = await SubSector.findOne({ 
        where: { code: req.body.code } 
      });
      if (existingCode) {
        return res.status(409).json({  // 409 Conflict for duplicate resource
          status: 'error',
          message: 'Sub-sector code already exists',
          details: `Code '${req.body.code}' is already in use`
        });
      }

      // Check if name already exists
      const existingName = await SubSector.findOne({ 
        where: { name: req.body.name } 
      });
      if (existingName) {
        return res.status(409).json({
          status: 'error',
          message: 'Sub-sector name already exists',
          details: `Name '${req.body.name}' is already in use`
        });
      }

      const subSector = await SubSector.create({
        sector_id: req.body.sector_id,
        code: req.body.code,
        name: req.body.name,
        // Add other fields if needed
      });
      
      res.status(201).json({
        status: 'success',
        data: subSector,
        message: 'Sub-sector created successfully'
      });
    } catch (error) {
      console.error('Create sub-sector error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Update sub-sector
  updateSubSector: async (req, res) => {
    try {
      const subSector = await SubSector.findByPk(req.params.id);
      if (!subSector) {
        return res.status(404).json({
          status: 'error',
          message: 'Sub-sector not found'
        });
      }

      // If code is being updated, check if new code exists
      if (req.body.code && req.body.code !== subSector.code) {
        const existingCode = await SubSector.findOne({ 
          where: { code: req.body.code } 
        });
        if (existingCode) {
          return res.status(400).json({
            status: 'error',
            message: 'Sub-sector code already exists'
          });
        }
      }

      // If name is being updated, check if new name exists
      if (req.body.name && req.body.name !== subSector.name) {
        const existingName = await SubSector.findOne({ 
          where: { name: req.body.name } 
        });
        if (existingName) {
          return res.status(400).json({
            status: 'error',
            message: 'Sub-sector name already exists'
          });
        }
      }

      // If sector_id is being updated, validate new sector exists
      if (req.body.sector_id && req.body.sector_id !== subSector.sector_id) {
        const sector = await Sector.findByPk(req.body.sector_id);
        if (!sector) {
          return res.status(400).json({
            status: 'error',
            message: 'Sector not found'
          });
        }
      }

      await subSector.update(req.body);
      
      res.json({
        status: 'success',
        data: subSector
      });
    } catch (error) {
      console.error('Update sub-sector error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error'
      });
    }
  },

  // Delete sub-sector
  deleteSubSector: async (req, res) => {
    try {
      const subSector = await SubSector.findByPk(req.params.id);
      if (!subSector) {
        return res.status(404).json({
          status: 'error',
          message: 'Sub-sector not found'
        });
      }

      await subSector.destroy();
      
      res.json({
        status: 'success',
        message: 'Sub-sector deleted successfully'
      });
    } catch (error) {
      console.error('Delete sub-sector error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
};