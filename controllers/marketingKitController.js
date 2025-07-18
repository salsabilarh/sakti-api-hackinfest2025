// controllers/marketingKitController.js
const { MarketingKit, Service, User, DownloadLog } = require('../models');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');

exports.getAllMarketingKits = async (req, res) => {
  try {
    const { search, service, file_type } = req.query;
    const where = {};
    const include = [];

    // Filter berdasarkan search
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { '$service.name$': { [Op.like]: `%${search}%` } },
      ];
    }

    // Filter berdasarkan service
    if (service) {
      include.push({
        model: Service,
        as: 'service',
        where: { id: service },
        attributes: [],
      });
    }

    // Filter berdasarkan file_type
    if (file_type) {
      where.file_type = file_type;
    }

    // Dapatkan marketing kits berdasarkan filter
    const marketingKits = await MarketingKit.findAll({
      where,
      include: [
        ...include,
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

exports.downloadMarketingKit = async (req, res) => {
  try {
    const { id } = req.params;
    const { purpose } = req.body;

    // Cari marketing kit berdasarkan ID
    const marketingKit = await MarketingKit.findByPk(id);
    if (!marketingKit) {
      return res.status(404).json({ error: 'Marketing kit not found' });
    }

    // Buat log download
    await DownloadLog.create({
      marketing_kit_id: id,
      user_id: req.user.id,
      purpose,
    });

    // Dapatkan path file
    const filePath = path.join(__dirname, '..', 'uploads', marketingKit.file_path);

    // Download file
    res.download(filePath, marketingKit.name, (err) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to download file' });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to download marketing kit' });
  }
};

exports.uploadMarketingKit = async (req, res) => {
  try {
    const { service_id, file_type } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Cari service berdasarkan ID
    const service = await Service.findByPk(service_id);
    if (!service) {
      // Hapus file yang sudah diupload jika service tidak ditemukan
      fs.unlinkSync(file.path);
      return res.status(404).json({ error: 'Service not found' });
    }

    // Buat marketing kit baru
    const marketingKit = await MarketingKit.create({
      name: file.originalname,
      file_path: file.filename,
      file_type,
      service_id,
      uploaded_by: req.user.id,
    });

    res.status(201).json({ marketing_kit: marketingKit });
  } catch (error) {
    console.error(error);
    // Hapus file yang sudah diupload jika terjadi error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload marketing kit' });
  }
};

exports.updateMarketingKit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, file_type } = req.body;

    // Cari marketing kit berdasarkan ID
    const marketingKit = await MarketingKit.findByPk(id);
    if (!marketingKit) {
      return res.status(404).json({ error: 'Marketing kit not found' });
    }

    // Update data marketing kit
    await marketingKit.update({
      name: name || marketingKit.name,
      file_type: file_type || marketingKit.file_type,
    });

    res.json({ marketing_kit: marketingKit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update marketing kit' });
  }
};

exports.deleteMarketingKit = async (req, res) => {
  try {
    const { id } = req.params;

    // Cari marketing kit berdasarkan ID
    const marketingKit = await MarketingKit.findByPk(id);
    if (!marketingKit) {
      return res.status(404).json({ error: 'Marketing kit not found' });
    }

    // Dapatkan path file
    const filePath = path.join(__dirname, '..', 'uploads', marketingKit.file_path);

    // Hapus file dari sistem file
    fs.unlinkSync(filePath);

    // Hapus marketing kit dari database
    await marketingKit.destroy();

    res.json({ message: 'Marketing kit deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete marketing kit' });
  }
};