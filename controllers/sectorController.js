// controllers/sectorController.js
const { Sector, SubSector } = require('../models');

exports.getAllSectors = async (req, res) => {
  try {
    const sectors = await Sector.findAll({
      include: [
        {
          model: SubSector,
          as: 'sub_sectors',
          attributes: ['id', 'name', 'code'],
        },
      ],
      order: [['name', 'ASC']],
    });

    res.json({ sectors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get sectors' });
  }
};

exports.getSectorById = async (req, res) => {
  try {
    const { id } = req.params;

    const sector = await Sector.findByPk(id, {
      include: [
        {
          model: SubSector,
          as: 'sub_sectors',
          attributes: ['id', 'name', 'code'],
        },
      ],
    });

    if (!sector) {
      return res.status(404).json({ error: 'Sector not found' });
    }

    res.json({ sector });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get sector details' });
  }
};

exports.createSector = async (req, res) => {
  try {
    const { name, code } = req.body;

    // Buat sector baru
    const sector = await Sector.create({
      name,
      code,
    });

    res.status(201).json({ sector });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create sector' });
  }
};

exports.updateSector = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;

    // Cari sector berdasarkan ID
    const sector = await Sector.findByPk(id);
    if (!sector) {
      return res.status(404).json({ error: 'Sector not found' });
    }

    // Update data sector
    await sector.update({
      name: name || sector.name,
      code: code || sector.code,
    });

    res.json({ sector });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update sector' });
  }
};

exports.deleteSector = async (req, res) => {
  try {
    const { id } = req.params;

    // Cari sector berdasarkan ID
    const sector = await Sector.findByPk(id);
    if (!sector) {
      return res.status(404).json({ error: 'Sector not found' });
    }

    // Hapus sector
    await sector.destroy();

    res.json({ message: 'Sector deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete sector' });
  }
};

// Mendapatkan semua sub sektor
exports.getAllSubSectors = async (req, res) => {
  try {
    const subSectors = await SubSector.findAll({
      include: [
        {
          model: Sector,
          as: 'sector',
          attributes: ['id', 'name'],
        },
      ],
      order: [['code', 'ASC']],
    });

    res.json({ sub_sectors: subSectors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get sub sectors' });
  }
};

// Mendapatkan detail sub sektor berdasarkan ID
exports.getSubSectorById = async (req, res) => {
  try {
    const { id } = req.params;

    const subSector = await SubSector.findByPk(id, {
      include: [
        {
          model: Sector,
          as: 'sector',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!subSector) {
      return res.status(404).json({ error: 'Sub sector not found' });
    }

    res.json({ sub_sector: subSector });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get sub sector details' });
  }
};

exports.createSubSector = async (req, res) => {
  try {
    const { sector_id } = req.params;
    const { name, code } = req.body;

    // Cari sector berdasarkan ID
    const sector = await Sector.findByPk(sector_id);
    if (!sector) {
      return res.status(404).json({ error: 'Sector not found' });
    }

    // Buat sub sector baru
    const subSector = await SubSector.create({
      name,
      code,
      sector_id,
    });

    res.status(201).json({ sub_sector: subSector });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create sub sector' });
  }
};

exports.updateSubSector = async (req, res) => {
  try {
    const { sector_id, sub_sector_id } = req.params;
    const { name, code } = req.body;

    // Cari sub sector berdasarkan ID
    const subSector = await SubSector.findOne({
      where: {
        id: sub_sector_id,
        sector_id,
      },
    });

    if (!subSector) {
      return res.status(404).json({ error: 'Sub sector not found' });
    }

    // Update data sub sector
    await subSector.update({
      name: name || subSector.name,
      code: code || subSector.code,
    });

    res.json({ sub_sector: subSector });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update sub sector' });
  }
};

exports.deleteSubSector = async (req, res) => {
  try {
    const { sector_id, sub_sector_id } = req.params;

    // Cari sub sector berdasarkan ID
    const subSector = await SubSector.findOne({
      where: {
        id: sub_sector_id,
        sector_id,
      },
    });

    if (!subSector) {
      return res.status(404).json({ error: 'Sub sector not found' });
    }

    // Hapus sub sector
    await subSector.destroy();

    res.json({ message: 'Sub sector deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete sub sector' });
  }
};