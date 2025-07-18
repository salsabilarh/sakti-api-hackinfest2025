// controllers/jasaController.js
const { Jasa, SubPortfolio, UnitKerja, Sektor, SubSektor, JasaSektor } = require('../models');
const { Op } = require('sequelize');

// Get all jasas with filters
exports.getAllJasas = async (req, res) => {
  try {
    const { sektor, portfolio, search } = req.query;
    
    // Build filter object
    const filter = {};
    if (sektor) {
      filter['$JasaSektors.sektor_id$'] = sektor;
    }
    if (portfolio) {
      filter['$SubPortfolio.portfolio_id$'] = portfolio;
    }
    
    // Build search condition
    const searchCondition = search ? {
      [Op.or]: [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
        { '$SubPortfolio.code$': { [Op.like]: `%${search}%` } },
        { '$JasaSektors.Sektor.code$': { [Op.like]: `%${search}%` } }
      ]
    } : {};
    
    const jasas = await Jasa.findAll({
      where: { ...filter, ...searchCondition },
      include: [
        {
          model: SubPortfolio,
          attributes: ['name', 'code'],
          include: [
            {
              association: 'Portfolio',
              attributes: ['name', 'code']
            }
          ]
        },
        {
          model: UnitKerja,
          as: 'sbu_owner',
          attributes: ['name']
        },
        {
          model: Sektor,
          through: { attributes: [] },
          attributes: ['name', 'code']
        }
      ],
      attributes: ['id', 'name', 'code', 'kelompok_jasa']
    });
    
    res.json(jasas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get jasa details
exports.getJasaDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const jasa = await Jasa.findByPk(id, {
      include: [
        {
          model: SubPortfolio,
          attributes: ['name', 'code'],
          include: [
            {
              association: 'Portfolio',
              attributes: ['name', 'code']
            }
          ]
        },
        {
          model: UnitKerja,
          as: 'sbu_owner',
          attributes: ['name']
        },
        {
          model: Sektor,
          through: { attributes: [] },
          attributes: ['id', 'name', 'code'],
          include: [
            {
              model: SubSektor,
              through: { attributes: [] },
              attributes: ['id', 'name', 'code']
            }
          ]
        }
      ]
    });
    
    if (!jasa) {
      return res.status(404).json({ message: 'Jasa not found' });
    }
    
    res.json(jasa);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new jasa
exports.createJasa = async (req, res) => {
  try {
    const {
      name,
      kelompok_jasa,
      url_intro_video,
      overview,
      manfaat,
      ruang_lingkup,
      output,
      regulation_ref,
      sbu_owner_id,
      sub_portfolio_id,
      sektor_ids,
      sub_sektor_ids
    } = req.body;
    
    // Get sub portfolio to generate code
    const subPortfolio = await SubPortfolio.findByPk(sub_portfolio_id);
    if (!subPortfolio) {
      return res.status(404).json({ message: 'Sub Portfolio not found' });
    }
    
    // Find the latest jasa with this sub portfolio to generate next code
    const latestJasa = await Jasa.findOne({
      where: { sub_portfolio_id },
      order: [['code', 'DESC']],
      limit: 1
    });
    
    let nextCode;
    if (!latestJasa) {
      nextCode = `${subPortfolio.code}A`;
    } else {
      const lastChar = latestJasa.code.slice(-1);
      nextCode = `${subPortfolio.code}${String.fromCharCode(lastChar.charCodeAt(0) + 1)}`;
    }
    
    // Create jasa
    const jasa = await Jasa.create({
      name,
      code: nextCode,
      kelompok_jasa,
      url_intro_video,
      overview,
      manfaat,
      ruang_lingkup,
      output,
      regulation_ref,
      sbu_owner_id,
      sub_portfolio_id
    });
    
    // Add sektor and sub sektor associations
    if (sektor_ids && sektor_ids.length > 0) {
      const jasaSektorData = sektor_ids.map((sektor_id, index) => ({
        jasa_id: jasa.id,
        sektor_id,
        sub_sektor_id: sub_sektor_ids[index] || null
      }));
      
      await JasaSektor.bulkCreate(jasaSektorData);
    }
    
    res.status(201).json(jasa);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update jasa
exports.updateJasa = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      kelompok_jasa,
      url_intro_video,
      overview,
      manfaat,
      ruang_lingkup,
      output,
      regulation_ref,
      sbu_owner_id,
      sektor_ids,
      sub_sektor_ids
    } = req.body;
    
    const jasa = await Jasa.findByPk(id);
    if (!jasa) {
      return res.status(404).json({ message: 'Jasa not found' });
    }
    
    // Update jasa
    await jasa.update({
      name: name || jasa.name,
      kelompok_jasa: kelompok_jasa || jasa.kelompok_jasa,
      url_intro_video: url_intro_video || jasa.url_intro_video,
      overview: overview || jasa.overview,
      manfaat: manfaat || jasa.manfaat,
      ruang_lingkup: ruang_lingkup || jasa.ruang_lingkup,
      output: output || jasa.output,
      regulation_ref: regulation_ref || jasa.regulation_ref,
      sbu_owner_id: sbu_owner_id || jasa.sbu_owner_id
    });
    
    // Update sektor associations if provided
    if (sektor_ids && sektor_ids.length > 0) {
      // Remove existing associations
      await JasaSektor.destroy({ where: { jasa_id: jasa.id } });
      
      // Add new associations
      const jasaSektorData = sektor_ids.map((sektor_id, index) => ({
        jasa_id: jasa.id,
        sektor_id,
        sub_sektor_id: sub_sektor_ids[index] || null
      }));
      
      await JasaSektor.bulkCreate(jasaSektorData);
    }
    
    res.json(jasa);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete jasa
exports.deleteJasa = async (req, res) => {
  try {
    const { id } = req.params;
    
    const jasa = await Jasa.findByPk(id);
    if (!jasa) {
      return res.status(404).json({ message: 'Jasa not found' });
    }
    
    await jasa.destroy();
    
    res.json({ message: 'Jasa deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};