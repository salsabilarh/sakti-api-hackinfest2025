const { Unit } = require('../models');

exports.getAllUnits = async (req, res) => {
  try {
    const where = {};
    if (req.query.type) {
      where.type = req.query.type;
    }

    const units = await Unit.findAll({
      where,
      attributes: ['id', 'name', 'type'],
      order: [['name', 'ASC']],
    });

    res.json({ units });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get units' });
  }
};

exports.getUnitById = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await Unit.findByPk(id, {
      attributes: ['id', 'name', 'type'],
    });

    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    res.json({ unit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get unit details' });
  }
};

exports.createUnit = async (req, res) => {
  try {
    const { name, code, type } = req.body;

    // Buat unit baru
    const unit = await Unit.create({
      name,
      type,
    });

    res.status(201).json({ unit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create unit' });
  }
};

exports.updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    // Cari unit berdasarkan ID
    const unit = await Unit.findByPk(id);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    // Update data unit
    await unit.update({
      name: name || unit.name,
      type: type || unit.type,
    });

    res.json({ unit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update unit' });
  }
};

exports.deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    // Cari unit berdasarkan ID
    const unit = await Unit.findByPk(id);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    // Hapus unit
    await unit.destroy();

    res.json({ message: 'Unit deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete unit' });
  }
};