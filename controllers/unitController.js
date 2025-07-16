const { Unit } = require('../models');

const unitController = {
  // Create a new unit
  createUnit: async (req, res) => {
    try {
      const { name } = req.body;

      // Validation
      if (!name) {
        return res.status(400).json({ message: 'Unit name is required' });
      }

      // Check if unit already exists
      const existingUnit = await Unit.findOne({ where: { name } });
      if (existingUnit) {
        return res.status(400).json({ message: 'Unit already exists' });
      }

      // Create new unit
      const newUnit = await Unit.create({ name });

      res.status(201).json({
        message: 'Unit created successfully',
        unit: newUnit
      });

    } catch (error) {
      console.error('Create unit error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Get all units
  getAllUnits: async (req, res) => {
    try {
      const units = await Unit.findAll({
        order: [['created_at', 'ASC']]
      });

      res.json({
        message: 'Units retrieved successfully',
        units,
        count: units.length
      });

    } catch (error) {
      console.error('Get all units error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Get single unit by ID
  getUnitById: async (req, res) => {
    try {
      const { id } = req.params;

      const unit = await Unit.findByPk(id);

      if (!unit) {
        return res.status(404).json({ message: 'Unit not found' });
      }

      res.json({
        message: 'Unit retrieved successfully',
        unit
      });

    } catch (error) {
      console.error('Get unit by ID error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Update unit
  updateUnit: async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      // Validation
      if (!name) {
        return res.status(400).json({ message: 'Unit name is required' });
      }

      const unit = await Unit.findByPk(id);

      if (!unit) {
        return res.status(404).json({ message: 'Unit not found' });
      }

      // Check if new name already exists
      if (name !== unit.name) {
        const existingUnit = await Unit.findOne({ where: { name } });
        if (existingUnit) {
          return res.status(400).json({ message: 'Unit name already exists' });
        }
      }

      // Update unit
      unit.name = name;
      await unit.save();

      res.json({
        message: 'Unit updated successfully',
        unit
      });

    } catch (error) {
      console.error('Update unit error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Delete unit
  deleteUnit: async (req, res) => {
    try {
      const { id } = req.params;

      const unit = await Unit.findByPk(id);

      if (!unit) {
        return res.status(404).json({ message: 'Unit not found' });
      }

      // Check if unit has associated users
      const usersCount = await unit.countUsers();
      if (usersCount > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete unit with associated users',
          usersCount
        });
      }

      // Delete unit
      await unit.destroy();

      res.json({
        message: 'Unit deleted successfully',
        deletedUnitId: id
      });

    } catch (error) {
      console.error('Delete unit error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

module.exports = unitController;