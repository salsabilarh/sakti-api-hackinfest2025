const { MarketingKit, Service, User, DownloadLog, Portfolio, SubPortfolio } = require('../models');
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
    const include = [
      {
        model: Service,
        as: 'services',
        attributes: ['id', 'name', 'code'],
        through: { attributes: [] },
        ...(service ? { where: { id: service } } : {}),
      },
      {
        model: User,
        as: 'uploader',
        attributes: ['id', 'full_name', 'email'],
      },
    ];

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { '$services.name$': { [Op.like]: `%${search}%` } },
      ];
    }

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
          as: 'services',
          attributes: ['id', 'name', 'code'],
          through: { attributes: [] },
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
    const { name, file_type, service_ids } = req.body;
    const file = req.file;

    if (!name || !file_type || !file || !service_ids || !service_ids.length) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    const uploaded = await cloudinary.uploader.upload(file.path, {
      folder: 'marketing_kits',
    });

    const newKit = await MarketingKit.create({
      name,
      file_type,
      file_path: uploaded.secure_url,
      cloudinary_public_id: uploaded.public_id,
      uploaded_by: req.user.id,
    });

    // Hubungkan ke service (many-to-many)
    await newKit.setServices(service_ids);

    await unlinkFile(file.path); // hapus file lokal

    res.status(201).json({ message: 'Berhasil unggah marketing kit', marketing_kit: newKit });
  } catch (err) {
    console.error('Error creating marketing kit:', err);
    res.status(500).json({ error: 'Gagal unggah marketing kit' });
  }
};

exports.updateMarketingKit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, file_type } = req.body;
    let service_ids = req.body.service_ids || [];

    if (!Array.isArray(service_ids)) {
      service_ids = [service_ids];
    }

    const file = req.file;

    const marketingKit = await MarketingKit.findByPk(id);
    if (!marketingKit) {
      return res.status(404).json({ error: 'Marketing kit not found' });
    }

    // Jika ada file baru
    if (file) {
      // Hapus file lama di Cloudinary jika ada
      if (marketingKit.cloudinary_public_id) {
        await cloudinary.uploader.destroy(marketingKit.cloudinary_public_id);
      }

      // Upload file baru ke Cloudinary
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: 'marketing_kits',
        resource_type: 'raw',
      });

      // Hapus file dari local storage
      fs.unlink(file.path, (err) => {
        if (err) console.warn('Failed to delete local file:', err);
      });

      // Update file_path dan public_id
      marketingKit.file_path = uploadResult.secure_url;
      marketingKit.cloudinary_public_id = uploadResult.public_id;
    }

    // Update field lainnya
    marketingKit.name = name ?? marketingKit.name;
    marketingKit.file_type = file_type ?? marketingKit.file_type;

    await marketingKit.save();

    // Update relasi many-to-many jika ada
    await marketingKit.setServices(service_ids);

    const updatedMarketingKit = await MarketingKit.findByPk(id, {
      include: [
        {
          model: Service,
          as: 'services',
          include: [
            { model: Portfolio, as: 'portfolio' },
            { model: SubPortfolio, as: 'sub_portfolio' },
            { model: MarketingKit, as: 'marketing_kits' }
          ]
        }
      ]
    });

    res.json({
      message: 'Marketing kit updated successfully',
      marketing_kit: updatedMarketingKit,
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update marketing kit' });
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

    const getPublicId = (filePath) => {
      try {
        const url = new URL(filePath);
        const parts = url.pathname.split('/');
        const fileWithExt = parts.pop();
        const fileNameOnly = fileWithExt.replace(/\.[^/.]+$/, '');
        const folderPath = parts.slice(parts.indexOf('upload') + 1).join('/');
        return `${folderPath}/${fileNameOnly}`;
      } catch {
        return null;
      }
    };

    const publicIdWithoutExt = getPublicId(marketingKit.file_path);
    if (!publicIdWithoutExt) {
      return res.status(500).json({ error: 'Invalid file path format' });
    }

    const fileExtension = path.extname(marketingKit.file_path).replace('.', '') || 'pdf';
    const downloadFilename = marketingKit.name || 'file';

    const signedUrl = cloudinary.utils.private_download_url(
      marketingKit.cloudinary_public_id,
      fileExtension,
      {
        resource_type: 'raw',
        type: 'upload',
        expires_at: Math.floor(Date.now() / 1000) + 60,
        attachment: downloadFilename,
      }
    );

    return res.redirect(signedUrl);
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ error: 'Failed to download marketing kit' });
  }
};

exports.deleteMarketingKit = async (req, res) => {
  try {
    const marketingKit = await MarketingKit.findByPk(req.params.id);

    if (!marketingKit) {
      return res.status(404).json({ message: 'Marketing kit not found' });
    }

    if (marketingKit.cloudinary_public_id) {
      await cloudinary.uploader.destroy(marketingKit.cloudinary_public_id);
    }

    await marketingKit.destroy();

    return res.status(200).json({ message: 'Marketing kit deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ message: 'Error deleting marketing kit' });
  }
};
