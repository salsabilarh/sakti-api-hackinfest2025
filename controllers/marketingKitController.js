// controllers/marketingKitController.js
const { MarketingKit, Jasa, User, DownloadLog } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// Get all marketing kits with filters
exports.getAllMarketingKits = async (req, res) => {
  try {
    const { jasa, file_type, search } = req.query;
    
    // Build filter object
    const filter = {};
    if (jasa) filter.jasa_id = jasa;
    if (file_type) filter.file_type = file_type;
    
    // Build search condition
    const searchCondition = search ? {
      [Op.or]: [
        { name: { [Op.like]: `%${search}%` } },
        { '$Jasa.name$': { [Op.like]: `%${search}%` } }
      ]
    } : {};
    
    const marketingKits = await MarketingKit.findAll({
      where: { ...filter, ...searchCondition },
      include: [
        {
          model: Jasa,
          attributes: ['name']
        },
        {
          model: User,
          as: 'uploaded_by_user',
          attributes: ['name']
        }
      ],
      attributes: ['id', 'name', 'file_type', 'file_path', 'file_size', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(marketingKits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload marketing kit file
exports.uploadMarketingKit = async (req, res) => {
  try {
    const { name, file_type, jasa_id } = req.body;
    const uploaded_by = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Create marketing kit record
    const marketingKit = await MarketingKit.create({
      name,
      file_type,
      file_path: req.file.path,
      file_size: req.file.size,
      jasa_id,
      uploaded_by
    });
    
    res.status(201).json(marketingKit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Download marketing kit file
exports.downloadMarketingKit = async (req, res) => {
  try {
    const { id } = req.params;
    const { purpose } = req.body;
    const userId = req.user.id;
    
    const marketingKit = await MarketingKit.findByPk(id);
    if (!marketingKit) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check if file exists
    if (!fs.existsSync(marketingKit.file_path)) {
      return res.status(404).json({ message: 'File not found on server' });
    }
    
    // Log the download
    await DownloadLog.create({
      marketing_kit_id: id,
      user_id: userId,
      purpose
    });
    
    // Send the file
    res.download(marketingKit.file_path, marketingKit.name);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete marketing kit file
exports.deleteMarketingKit = async (req, res) => {
  try {
    const { id } = req.params;
    
    const marketingKit = await MarketingKit.findByPk(id);
    if (!marketingKit) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Delete file from filesystem
    if (fs.existsSync(marketingKit.file_path)) {
      fs.unlinkSync(marketingKit.file_path);
    }
    
    // Delete record from database
    await marketingKit.destroy();
    
    res.json({ message: 'Marketing kit deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};