const { MarketingKit, Service, User, DownloadLog, Portfolio, SubPortfolio, sequelize } = require('../models');
const fs = require('fs').promises;
const path = require('path');
const { Op } = require('sequelize');
const cloudinary = require('../config/cloudinary');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);
// const cloudinary = require('cloudinary').v2;

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// MIME/ekstensi yang diizinkan
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
]);
const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx']);

function normalizeServiceIds(input) {
  if (!input) return [];
  // Bisa datang sebagai array dari form-data: service_ids[]=a, service_ids[]=b
  if (Array.isArray(input)) return [...new Set(input.map(String))];
  // Bisa datang sebagai string tunggal: "id"
  if (typeof input === 'string') {
    const s = input.trim();
    // Bisa jadi JSON string: '["a","b"]'
    if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('"') && s.endsWith('"'))) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return [...new Set(parsed.map(String))];
        return parsed ? [String(parsed)] : [];
      } catch {
        // fallback
      }
    }
    // Bisa juga comma-separated: "a,b,c"
    if (s.includes(',')) return [...new Set(s.split(',').map(v => v.trim()).filter(Boolean))];
    return [s];
  }
  // Fallback
  return [];
}

function isAllowedFile(file) {
  if (!file) return false;
  const ext = path.extname(file.originalname || '').toLowerCase();
  const byMime = file.mimetype ? ALLOWED_MIME.has(file.mimetype) : false;
  const byExt = ext ? ALLOWED_EXT.has(ext) : false;
  // Terima jika salah satu cocok (beberapa browser memberi mimetype octet-stream)
  return byMime || byExt;
}

async function safeUnlink(p) {
  if (!p) return;
  try { await fs.unlink(p); } catch (_) { /* ignore */ }
}

function ensureCloudinaryConfigured() {
  // Minimal cek via env CLOUDINARY_URL atau trio kredensial
  const hasUrl = !!process.env.CLOUDINARY_URL;
  const hasTriplet = !!(cloudinary.config().cloud_name && cloudinary.config().api_key && cloudinary.config().api_secret);
  return hasUrl || hasTriplet;
}

// Logic terpisah untuk mendapatkan satu MarketingKit dengan relasi lengkap
const getMarketingKitByIdLogic = async (id) => {
  return await MarketingKit.findByPk(id, {
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
};

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

    const marketingKit = await getMarketingKitByIdLogic(id);

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
  let transaction;

  try {
    const files = req.files;
    // service_ids dikirim sekali untuk semua file
    const rawServiceIds = req.body?.service_ids || req.body?.["service_ids[]"];
    const service_ids = normalizeServiceIds(rawServiceIds);

    // file_types dikirim sebaris per file
    let fileTypes = req.body?.file_types || req.body?.["file_types[]"] || [];
    if (!Array.isArray(fileTypes)) fileTypes = [fileTypes];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Minimal satu file harus diunggah" });
    }
    if (!service_ids.length) {
      return res.status(400).json({ error: "Minimal satu layanan harus dipilih" });
    }
    if (fileTypes.length !== files.length) {
      return res.status(400).json({ error: "Jumlah tipe file tidak sesuai jumlah file" });
    }

    // validasi service_ids
    const servicesCount = await Service.count({ where: { id: service_ids } });
    if (servicesCount !== service_ids.length) {
      return res.status(400).json({ error: "Terdapat service_id yang tidak valid" });
    }

    if (!ensureCloudinaryConfigured()) {
      return res.status(500).json({ error: "Cloudinary tidak dikonfigurasi" });
    }

    transaction = await sequelize.transaction();
    const createdKits = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const file_type = (fileTypes[i] || "").trim();

      if (!file_type) {
        throw new Error(`Tipe file wajib dipilih untuk file ${file.originalname}`);
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`Ukuran file ${file.originalname} melebihi ${MAX_FILE_SIZE_MB} MB`);
      }
      if (!isAllowedFile(file)) {
        throw new Error(`File ${file.originalname} memiliki tipe tidak didukung`);
      }

      let uploaded;
      try {
        uploaded = await cloudinary.uploader.upload(file.path, {
          folder: "marketing_kits",
          resource_type: "raw",
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        });
      } finally {
        await safeUnlink(file.path);
      }

      // buat 1 record MarketingKit per file
      const newKit = await MarketingKit.create(
        {
          name: file.originalname,
          file_type,
          file_path: uploaded.secure_url,
          cloudinary_public_id: uploaded.public_id,
          uploaded_by: req.user?.id || null,
        },
        { transaction }
      );

      // hubungkan ke semua service_ids yg sama untuk semua file
      await newKit.setServices(service_ids, { transaction });

      createdKits.push({ ...newKit.toJSON(), file_url: uploaded.secure_url });
    }

    await transaction.commit();
    return res.status(201).json({
      message: "Berhasil mengunggah semua marketing kit",
      marketing_kits: createdKits,
    });
  } catch (err) {
    if (transaction) {
      try { await transaction.rollback(); } catch (rollbackErr) {
        console.error("Rollback error:", rollbackErr);
      }
    }
    console.error("createMarketingKit error:", err);
    return res.status(500).json({
      error: "Terjadi kesalahan saat upload",
      details: err.message,
    });
  }
};

exports.updateMarketingKit = async (req, res) => {
  try {
    const { id } = req.params;
    const { file_type } = req.body;
    let service_ids = req.body.service_ids || [];

    if (!Array.isArray(service_ids)) {
      service_ids = [service_ids];
    }

    const file = req.file;

    const marketingKit = await MarketingKit.findByPk(id);
    if (!marketingKit) {
      return res.status(404).json({ error: 'Marketing kit tidak ditemukan' });
    }

    // Jika ada file baru
    if (file) {
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        return res.status(400).json({ error: `Ukuran file maksimal ${MAX_FILE_SIZE_MB} MB` });
      }

      try {
        if (marketingKit.cloudinary_public_id) {
          await cloudinary.uploader.destroy(marketingKit.cloudinary_public_id);
        }

        const uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: 'marketing_kits',
          resource_type: 'raw',
        });

        fs.unlink(file.path, (err) => {
          if (err) console.warn('Gagal menghapus file lokal:', err);
        });

        marketingKit.file_path = uploadResult.secure_url;
        marketingKit.cloudinary_public_id = uploadResult.public_id;
        marketingKit.name = file.originalname; // gunakan nama asli file baru
      } catch (err) {
        console.error('Gagal upload file baru:', err);
        if (err.http_code === 413) {
          return res.status(400).json({ error: 'Ukuran file melebihi batas maksimum (100 MB)' });
        }
        return res.status(500).json({
          error: 'Gagal mengunggah file baru',
          details: err.message,
        });
      }
    }

    if (file_type) {
      marketingKit.file_type = file_type;
    }

    await marketingKit.save();
    await marketingKit.setServices(service_ids);

    const updatedMarketingKit = await getMarketingKitByIdLogic(id);

    res.json({
      message: 'Marketing kit berhasil diperbarui',
      marketing_kit: updatedMarketingKit,
    });
  } catch (error) {
    console.error('Gagal memperbarui marketing kit:', error);
    res.status(500).json({
      error: 'Terjadi kesalahan saat memperbarui marketing kit',
      details: error.message,
    });
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
