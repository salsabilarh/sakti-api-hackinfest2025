// controllers/marketingKitController.js
const { MarketingKit, Service, User, DownloadLog } = require('../models');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const cloudinary = require('../config/cloudinary');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);

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

    // Upload file ke Cloudinary
    const uploadResult = await cloudinary.uploader.upload(file.path, {
      folder: 'marketing_kits',
      resource_type: 'raw',
      use_filename: true,
      unique_filename: false,
    });

    // Hapus file lokal setelah upload
    fs.unlink(file.path, (err) => {
      if (err) console.warn('Failed to delete local file:', err);
    });

    // Simpan ke database
    const newMarketingKit = await MarketingKit.create({
      name: file.originalname,
      file_path: uploadResult.secure_url,
      cloudinary_public_id: uploadResult.public_id,
      file_type: req.body.file_type,
      service_id: req.body.service_id,
      uploaded_by: req.user.id,
    });

    // Generate signed private download URL
    const downloadUrl = cloudinary.utils.private_download_url(
      uploadResult.public_id,
      uploadResult.format || 'pdf', // fallback ke PDF jika format tidak ada
      {
        resource_type: 'raw',
        type: 'upload',
        expires_at: Math.floor(Date.now() / 1000) + 60, // expired dalam 60 detik
        attachment: file.originalname,
      }
    );

    return res.status(201).json({
      message: 'Marketing kit uploaded successfully',
      marketing_kit: newMarketingKit,
      download_url: downloadUrl, // ✅ dikirim ke frontend
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

    const downloadFilename = marketingKit.name || originalFileName;

    const signedUrl = cloudinary.utils.private_download_url(
    sanitizedPublicId,
    fileExtension,
    {
      resource_type: 'raw',
      type: 'upload',
      expires_at: Math.floor(Date.now() / 1000) + 60,
      attachment: downloadFilename,
    }
  );

  return res.redirect(signedUrl); // 302 otomatis
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ error: 'Failed to download marketing kit' });
  }
};

exports.updateMarketingKit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, file_type, service_id } = req.body;
    const file = req.file;

    const marketingKit = await MarketingKit.findByPk(id);
    if (!marketingKit) {
      return res.status(404).json({ error: 'Marketing kit not found' });
    }

    // Jika ada file baru yang diupload
    if (file) {
      // Hapus file lama jika ada dan dari local (bukan dari cloud URL)
      if (marketingKit.file && fs.existsSync(marketingKit.file)) {
        await unlinkFile(marketingKit.file);
      }

      // Simpan path file baru (pastikan sudah diset via multer middleware)
      marketingKit.file = file.path;
    }

    // Update kolom lainnya
    marketingKit.name = name ?? marketingKit.name;
    marketingKit.file_type = file_type ?? marketingKit.file_type;
    marketingKit.service_id = service_id ?? marketingKit.service_id;

    await marketingKit.save();

    res.json({ message: 'Marketing kit updated successfully', marketing_kit: marketingKit });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update marketing kit' });
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

