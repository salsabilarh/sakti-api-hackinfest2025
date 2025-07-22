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
    const uploadResult = cloudinary.uploader.upload(filePath, {
      public_id: 'marketing_kits/xchfw2ty4kl48cmkjxyo',
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
      file_type: req.body.file_type,
      service_id: req.body.service_id,
      uploaded_by: req.user.id,
    });

    console.log('req.body:', req.body);
    console.log('req.file:', req.file);

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

    // Ekstrak public_id jika file_path adalah URL
    const getPublicId = (filePath) => {
      try {
        const url = new URL(filePath);
        const parts = url.pathname.split('/');
        const fileWithExt = parts.pop(); // "xchfw2ty4kl48cmkjxyo.pdf"
        const fileNameOnly = fileWithExt.replace(/\.[^/.]+$/, ''); // remove extension
        const folderPath = parts.slice(parts.indexOf('upload') + 1).join('/'); // e.g., "v1234/marketing_kits"
        return `${folderPath}/${fileNameOnly}`; // result: "marketing_kits/xchfw2ty4kl48cmkjxyo"
      } catch {
        return null;
      }
    };

    const publicIdWithoutExt = getPublicId(marketingKit.file_path);
    if (!publicIdWithoutExt) {
      return res.status(500).json({ error: 'Invalid file path format' });
    }

    const sanitizedPublicId = marketingKit.cloudinary_public_id.replace(/^v\d+\//, '');
    const fileExtension = path.extname(marketingKit.file_path).replace('.', '') || 'pdf';
    const originalFileName = path.basename(marketingKit.file_path);

    // Nama file untuk diunduh
    const downloadFilename = marketingKit.name || originalFileName;

    const signedUrl = cloudinary.utils.private_download_url(
      sanitizedPublicId,
      fileExtension, // Ekstensi file sesuai dengan path-nya
      {
        type: 'upload', // atau 'authenticated' sesuai tipe upload
        expires_at: Math.floor(Date.now() / 1000) + 60,
        attachment: downloadFilename, // Menentukan nama file saat diunduh
      }
    );

    return res.status(302).redirect(signedUrl);
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

