// controllers/marketingKitController.js
const { MarketingKit, Service, User, DownloadLog } = require('../models');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const cloudinary = require('../config/cloudinary');

exports.getAllMarketingKits = async (req, res) => {
  try {
    const { search, service, file_type } = req.query;
    const where = {};
    const include = [];

    // Always include service
    const serviceInclude = {
      model: Service,
      as: 'service',
      attributes: ['id', 'name', 'code'],
    };

    if (service) {
      serviceInclude.where = { id: service };
    }

    include.push(serviceInclude);

    // Include uploader
    include.push({
      model: User,
      as: 'uploader',
      attributes: ['id', 'full_name', 'email'],
    });

    // Search
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { '$service.name$': { [Op.like]: `%${search}%` } },
      ];
    }

    // File type
    if (file_type) {
      where.file_type = file_type;
    }

    const marketingKits = await MarketingKit.findAll({
      where,
      include,
      order: [['created_at', 'DESC']],
    });

    res.json({ marketing_kits: marketingKits });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get marketing kits' });
  }
};

exports.getMarketingKitById = async (req, res) => {
  try {
    const { id } = req.params;

    const marketingKit = await MarketingKit.findByPk(id, {
      include: [
        {
          model: Service,
          as: 'service',
          attributes: ['id', 'name', 'code'],
        },
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'full_name', 'email'],
        },
      ],
    });

    if (!marketingKit) {
      return res.status(404).json({ error: 'Marketing kit not found' });
    }

    res.json({ marketing_kit: marketingKit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get marketing kit details' });
  }
};

exports.createMarketingKit = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Upload ke Cloudinary
    const uploadResult = await cloudinary.uploader.upload(file.path, {
      folder: 'marketing_kits',
      resource_type: 'auto',
    });

    // Hapus file lokal
    fs.unlink(file.path, (err) => {
      if (err) console.warn('Failed to delete local file:', err);
    });

    // Simpan ke DB
    const newMarketingKit = await MarketingKit.create({
      name: req.body.name,
      file_path: uploadResult.secure_url,
      cloudinary_public_id: uploadResult.public_id,
      file_type: file.mimetype,
      service_id: req.body.service_id,
      uploaded_by: req.user.id,
    });

    return res.status(201).json({
      message: 'Marketing kit uploaded successfully',
      data: newMarketingKit,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ message: 'Error uploading marketing kit' });
  }
};

exports.downloadMarketingKit = async (req, res) => {
  try {
    const { id } = req.params;
    const { purpose } = req.body;

    const marketingKit = await MarketingKit.findByPk(id);
    if (!marketingKit) {
      return res.status(404).json({ error: 'Marketing kit not found' });
    }

    await DownloadLog.create({
      marketing_kit_id: id,
      user_id: req.user.id,
      purpose,
    });

    // Redirect pengguna ke URL Cloudinary (langsung download atau preview tergantung file)
    return res.status(302).redirect(marketingKit.file_path);
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ error: 'Failed to download marketing kit' });
  }
};

exports.updateMarketingKit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, file_type } = req.body;

    const marketingKit = await MarketingKit.findByPk(id);
    if (!marketingKit) {
      return res.status(404).json({ error: 'Marketing kit not found' });
    }

    await marketingKit.update({
      name: name || marketingKit.name,
      file_type: file_type || marketingKit.file_type,
    });

    res.json({ message: 'Marketing kit updated', marketing_kit: marketingKit });
  } catch (error) {
    console.error('Update error:', error);
    return res.status(500).json({ error: 'Failed to update marketing kit' });
  }
};

exports.deleteMarketingKit = async (req, res) => {
  try {
    const marketingKit = await MarketingKit.findByPk(req.params.id);

    if (!marketingKit) {
      return res.status(404).json({ message: 'Marketing kit not found' });
    }

    // Hapus dari Cloudinary
    if (marketingKit.cloudinary_public_id) {
      await cloudinary.uploader.destroy(marketingKit.cloudinary_public_id);
    }

    // Hapus dari DB
    await marketingKit.destroy();

    return res.status(200).json({ message: 'Marketing kit deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ message: 'Error deleting marketing kit' });
  }
};

