const { Service, Portfolio, SubPortfolio, Unit, Sector, SubSector, MarketingKit } = require('../models');
const { Op } = require('sequelize');
const xlsx = require('xlsx');

exports.getAllServices = async (req, res) => {
  try {
    const { search, portfolio, sector, page = 1, limit = 10, sort = 'name', order = 'asc' } = req.query;
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

    let orderClause = [];

    if (sort === 'portfolio') {
      orderClause = [[{ model: Portfolio, as: 'portfolio' }, 'name', order]];
    } else if (sort === 'subPortfolio') {
      orderClause = [[{ model: SubPortfolio, as: 'sub_portfolio' }, 'code', order]];
    } else if (sort === 'sector') {
      orderClause = [[{ model: Sector, as: 'sectors' }, 'code', order]];
    } else {
      orderClause = [[sort, order]];
    }

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
      order: orderClause,
      attributes: ['id', 'name', 'code'],
    });

    const allowedSortFields = ['name', 'code', 'portfolio', 'subPortfolio', 'sector'];
    if (!allowedSortFields.includes(sort)) {
      return res.status(400).json({ error: 'Invalid sort field' });
    }

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
          through: { attributes: [] }, // ⛔️ Jangan ambil atribut dari pivot
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

// exports.importServices = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: 'File not provided' });
//     }

//     const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const data = xlsx.utils.sheet_to_json(sheet);

//     const createdServices = [];

//     for (const row of data) {
//       const {
//         name,
//         code,
//         portfolio, // name
//         subPortfolio, // code
//         sectors // comma separated codes
//       } = row;

//       const portfolioRecord = await Portfolio.findOne({ where: { name: portfolio } });
//       const subPortfolioRecord = await SubPortfolio.findOne({ where: { code: subPortfolio } });

//       const service = await Service.create({
//         name,
//         code,
//         portfolio_id: portfolioRecord?.id || null,
//         sub_portfolio_id: subPortfolioRecord?.id || null,
//         created_by: req.user.id,
//       });

//       if (sectors) {
//         const sectorCodes = sectors.split(',').map(s => s.trim());
//         const sectorRecords = await Sector.findAll({ where: { code: sectorCodes } });
//         await service.addSectors(sectorRecords.map(s => s.id));
//       }

//       createdServices.push(service);
//     }

//     res.status(201).json({ message: 'Import berhasil', createdCount: createdServices.length });
//   } catch (error) {
//     console.error('Import error:', error);
//     res.status(500).json({ error: 'Import gagal' });
//   }
// };

// exports.downloadTemplate = (req, res) => {
//   const filePath = path.join(__dirname, '../templates/template_layanan.xlsx');
//   res.download(filePath, 'template_layanan.xlsx');
// };

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