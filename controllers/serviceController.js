const { Service, Portfolio, SubPortfolio, Unit, Sector, SubSector, MarketingKit } = require('../models');
const { Op } = require('sequelize');

exports.getAllServices = async (req, res) => {
  try {
    const { search, portfolio, sector, page = 1, limit = 10 } = req.query;
    const where = {};
    const include = [];

    // Filter pencarian
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
      ];
    }

    // Filter portfolio
    if (portfolio) {
      include.push({
        model: Portfolio,
        as: 'portfolio',
        where: { id: portfolio },
        attributes: [],
      });
    }

    // Filter sektor
    if (sector) {
      include.push({
        model: Sector,
        as: 'sectors',
        where: { id: sector },
        attributes: [],
        through: { attributes: [] },
      });
    }

    // Hitung total data tanpa limit
    const total = await Service.count({
      where,
      include,
      distinct: true
    });

    // Ambil data layanan
    const services = await Service.findAll({
      where,
      include: [
        ...include,
        {
          model: Portfolio,
          as: 'portfolio',
          attributes: ['name'],
        },
        {
          model: SubPortfolio,
          as: 'sub_portfolio',
          attributes: ['code'],
        },
        {
          model: Sector,
          as: 'sectors',
          attributes: ['code'],
          through: { attributes: [] },
        },
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      attributes: ['id', 'name', 'code'],
    });

    // Format data
    const formatted = services.map(service => ({
      id: service.id,
      name: service.name,
      code: service.code,
      portfolio: service.portfolio?.name || null,
      subPortfolio: service.sub_portfolio?.code || null,
      sectors: service.sectors.map(sector => sector.code),
    }));

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      services: formatted,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get services' });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findByPk(id, {
      include: [
        {
          model: Portfolio,
          as: 'portfolio',
          attributes: ['id', 'name'],
        },
        {
          model: SubPortfolio,
          as: 'sub_portfolio',
          attributes: ['id', 'name', 'code'],
        },
        {
          model: Unit,
          as: 'sbu_owner',
          attributes: ['id', 'name'],
        },
        {
          model: Sector,
          as: 'sectors',
          attributes: ['id', 'name', 'code'],
          through: { attributes: [] },
        },
        {
          model: SubSector,
          as: 'sub_sectors',
          attributes: ['id', 'name', 'code'],
          through: { attributes: [] },
        },
        {
          model: MarketingKit,
          as: 'marketing_kits',
          attributes: ['id', 'name', 'file_type', 'created_at'],
        },
      ],
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ service });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get service details' });
  }
};

exports.createService = async (req, res) => {
  try {
    const {
      name,
      group,
      intro_video_url,
      overview,
      scope,
      benefit,
      output,
      regulation_ref,
      portfolio_id,
      sub_portfolio_id,
      sbu_owner_id,
      sectors,
      sub_sectors,
    } = req.body;

    // Buat service baru
    const service = await Service.create({
      name,
      group,
      intro_video_url,
      overview,
      scope,
      benefit,
      output,
      regulation_ref,
      portfolio_id,
      sub_portfolio_id,
      sbu_owner_id,
      created_by: req.user.id,
    });

    // Validasi dan tambahkan relasi sektor
    if (Array.isArray(sectors) && sectors.length > 0) {
      await service.addSectors(sectors);
    }

    // Validasi dan tambahkan relasi sub sektor
    if (Array.isArray(sub_sectors) && sub_sectors.length > 0) {
      await service.addSub_sectors(sub_sectors);
    }

    // Dapatkan service dengan relasi yang lengkap untuk response
    const createdService = await Service.findByPk(service.id, {
      include: [
        {
          model: Portfolio,
          as: 'portfolio',
          attributes: ['id', 'name'],
        },
        {
          model: SubPortfolio,
          as: 'sub_portfolio',
          attributes: ['id', 'name', 'code'],
        },
        {
          model: Unit,
          as: 'sbu_owner',
          attributes: ['id', 'name'],
        },
        {
          model: Sector,
          as: 'sectors',
          attributes: ['id', 'name', 'code'],
          through: { attributes: [] },
        },
        {
          model: SubSector,
          as: 'sub_sectors',
          attributes: ['id', 'name', 'code'],
          through: { attributes: [] },
        },
      ],
    });

    res.status(201).json({ service: createdService });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create service' });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      group,
      intro_video_url,
      overview,
      scope,
      benefit,
      output,
      regulation_ref,
      sbu_owner_id,
      sectors,
      sub_sectors,
    } = req.body;

    // Cari service berdasarkan ID
    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Update data service
    await service.update({
      name,
      group,
      intro_video_url,
      overview,
      scope,
      benefit,
      output,
      regulation_ref,
      sbu_owner_id,
    });

    // Update sectors dan sub_sectors jika ada
    if (sectors) {
      await service.setSectors(sectors);
    }

    if (sub_sectors) {
      await service.setSub_sectors(sub_sectors);
    }

    // Dapatkan service yang sudah diupdate dengan relasi lengkap
    const updatedService = await Service.findByPk(id, {
      include: [
        {
          model: Portfolio,
          as: 'portfolio',
          attributes: ['id', 'name'],
        },
        {
          model: SubPortfolio,
          as: 'sub_portfolio',
          attributes: ['id', 'name', 'code'],
        },
        {
          model: Unit,
          as: 'sbu_owner',
          attributes: ['id', 'name'],
        },
        {
          model: Sector,
          as: 'sectors',
          attributes: ['id', 'name', 'code'],
          through: { attributes: [] },
        },
        {
          model: SubSector,
          as: 'sub_sectors',
          attributes: ['id', 'name', 'code'],
          through: { attributes: [] },
        },
      ],
    });

    res.json({ service: updatedService });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update service' });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    // Cari service berdasarkan ID
    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Hapus service
    await service.destroy();

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
};