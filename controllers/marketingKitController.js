/**
 * controllers/marketingKitController.js
 *
 * Mengelola operasi CRUD Marketing Kit:
 * - Upload file ke Cloudinary (multiple file sekaligus)
 * - Download dengan signed URL (expire 60 detik)
 * - Pencatatan log download untuk audit trail
 *
 * Seluruh endpoint dilindungi oleh middleware autentikasi.
 * Endpoint create/update/delete memerlukan role 'management' atau 'admin' (WRITE_ROLES).
 *
 * ============================================================
 * ARSITEKTUR DOWNLOAD
 * ============================================================
 * POST /api/marketing-kits/:id/download
 *   1. Validasi purpose (wajib diisi)
 *   2. Cari marketing kit di DB
 *   3. Catat DownloadLog ke DB
 *   4. Generate signed Cloudinary URL (expire 60 detik)
 *   5. Redirect client ke URL tersebut (atau kembalikan JSON dengan download_url)
 *
 * Signed URL expire cepat (60 detik) untuk mencegah sharing ulang.
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - safeUnlink()      : Selalu gunakan untuk hapus file temp, bukan fs.unlink() langsung
 * - normalizeServiceIds() : Mendukung berbagai format input (array, JSON, comma-separated)
 * - ensureCloudinaryConfigured() : Cek konfigurasi sebelum upload
 * - getMarketingKitWithRelations() : Sentralisasi include relasi
 */

// ============================================================
// Dependencies
// ============================================================
const { MarketingKit, Service, User, DownloadLog, sequelize } = require('../models');
const fsPromises = require('fs').promises;
const path = require('path');
const { Op } = require('sequelize');
const cloudinary = require('../config/cloudinary');

// ============================================================
// Constants
// ============================================================

/** Ukuran file maksimum yang diizinkan (10 MB) */
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** MIME types yang diizinkan */
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',   // .docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
]);

/** Ekstensi file yang diizinkan */
const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx']);

// ============================================================
// Helper Functions (Private)
// ============================================================

/**
 * Normalisasi input service_ids dari berbagai format form-data.
 * Mendukung: array, JSON string, comma-separated, single string.
 *
 * @param {any} input - req.body.service_ids atau req.body['service_ids[]']
 * @returns {string[]} Array of service ID (unique)
 */
function normalizeServiceIds(input) {
  if (!input) return [];
  if (Array.isArray(input)) return [...new Set(input.map(String))];
  if (typeof input === 'string') {
    const s = input.trim();
    if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('"') && s.endsWith('"'))) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return [...new Set(parsed.map(String))];
        return parsed ? [String(parsed)] : [];
      } catch {}
    }
    if (s.includes(',')) {
      return [...new Set(s.split(',').map(v => v.trim()).filter(Boolean))];
    }
    return [s];
  }
  return [];
}

/**
 * Validasi file berdasarkan MIME type dan ekstensi.
 *
 * @param {Object} file - Multer file object
 * @returns {boolean}
 */
function isAllowedFile(file) {
  if (!file) return false;
  const ext = path.extname(file.originalname || '').toLowerCase();
  const byMime = file.mimetype ? ALLOWED_MIME.has(file.mimetype) : false;
  const byExt = ext ? ALLOWED_EXT.has(ext) : false;
  return byMime || byExt;
}

/**
 * Hapus file dari disk dengan aman (tidak throw error jika file tidak ada).
 * selalu gunakan fungsi ini, BUKAN fs.unlink(path, callback).
 *
 * @param {string|null} filePath - Path file yang akan dihapus
 */
async function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    await fsPromises.unlink(filePath);
  } catch {
    // ignore
  }
}

/**
 * Cek konfigurasi Cloudinary sebelum upload.
 *
 * @returns {boolean} true jika Cloudinary siap digunakan
 */
function ensureCloudinaryConfigured() {
  const hasUrl = !!process.env.CLOUDINARY_URL;
  const hasTriplet = !!(
    cloudinary.config().cloud_name &&
    cloudinary.config().api_key &&
    cloudinary.config().api_secret
  );
  return hasUrl || hasTriplet;
}

/**
 * Ambil satu marketing kit dengan relasi lengkap (services & uploader).
 *
 * @param {string} id - UUID marketing kit
 * @returns {Promise<MarketingKit|null>}
 */
async function getMarketingKitWithRelations(id) {
  return MarketingKit.findByPk(id, {
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
}

// ============================================================
// Controllers
// ============================================================

/**
 * GET /api/marketing-kits
 *
 * Daftar semua marketing kit dengan filter opsional:
 * - search: pencarian nama kit atau nama layanan
 * - service: filter berdasarkan ID layanan
 * - file_type: filter berdasarkan tipe file
 */
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
    if (file_type) where.file_type = file_type;

    const marketingKits = await MarketingKit.findAll({
      where,
      include,
      order: [['created_at', 'DESC']],
      subQuery: false,
    });

    return res.json({ success: true, data: marketingKits });
  } catch (error) {
    console.error('[getAllMarketingKits] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil daftar marketing kit',
    });
  }
};

/**
 * GET /api/marketing-kits/:id
 *
 * Detail satu marketing kit beserta layanan dan uploader.
 */
exports.getMarketingKitById = async (req, res) => {
  try {
    const marketingKit = await getMarketingKitWithRelations(req.params.id);
    if (!marketingKit) {
      return res.status(404).json({
        success: false,
        pesan: 'Marketing kit tidak ditemukan',
      });
    }
    return res.json({ success: true, data: marketingKit });
  } catch (error) {
    console.error('[getMarketingKitById] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil detail marketing kit',
    });
  }
};

/**
 * POST /api/marketing-kits
 *
 * Upload satu atau lebih file marketing kit sekaligus.
 * Semua file dikaitkan dengan service_ids yang sama.
 * Operasi dibungkus transaksi; jika gagal, file Cloudinary di-cleanup.
 *
 * Cleanup Cloudinary jika DB INSERT gagal.
 */
exports.createMarketingKit = async (req, res) => {
  let transaction;
  const uploadedPublicIds = [];

  try {
    const files = req.files;
    const rawServiceIds = req.body?.service_ids || req.body?.['service_ids[]'];
    const service_ids = normalizeServiceIds(rawServiceIds);

    let fileTypes = req.body?.file_types || req.body?.['file_types[]'] || [];
    if (!Array.isArray(fileTypes)) fileTypes = [fileTypes];

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, pesan: 'Minimal satu file harus diunggah' });
    }
    if (!service_ids.length) {
      return res.status(400).json({ success: false, pesan: 'Minimal satu layanan harus dipilih' });
    }
    if (fileTypes.length !== files.length) {
      return res.status(400).json({ success: false, pesan: 'Jumlah tipe file tidak sesuai jumlah file yang diunggah' });
    }

    const servicesCount = await Service.count({ where: { id: service_ids } });
    if (servicesCount !== service_ids.length) {
      return res.status(400).json({ success: false, pesan: 'Terdapat ID layanan yang tidak valid. Periksa kembali pilihan layanan.' });
    }

    if (!ensureCloudinaryConfigured()) {
      return res.status(500).json({ success: false, pesan: 'Konfigurasi Cloudinary tidak lengkap. Hubungi admin sistem.' });
    }

    transaction = await sequelize.transaction();
    const createdKits = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const file_type = (fileTypes[i] || '').trim();

      if (!file_type) {
        await transaction.rollback();
        return res.status(400).json({ success: false, pesan: `Tipe file wajib dipilih untuk file: ${file.originalname}` });
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        await transaction.rollback();
        return res.status(400).json({ success: false, pesan: `File "${file.originalname}" melebihi batas ukuran ${MAX_FILE_SIZE_MB} MB` });
      }
      if (!isAllowedFile(file)) {
        await transaction.rollback();
        return res.status(400).json({ success: false, pesan: `Format file tidak didukung: ${path.extname(file.originalname)}. Hanya PDF, DOC, DOCX, PPT, PPTX yang diperbolehkan.` });
      }

      let names = req.body.names || req.body['names[]'];
      if (!Array.isArray(names)) names = names ? [names] : [];
      const displayName = (names[i] && names[i].trim()) ? names[i].trim() : path.parse(file.originalname).name;

      let uploaded;
      try {
        uploaded = await cloudinary.uploader.upload(file.path, {
          folder: 'marketing_kits',
          resource_type: 'raw',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        });
        uploadedPublicIds.push(uploaded.public_id);
      } finally {
        await safeUnlink(file.path);
      }

      let newKit;
      try {
        newKit = await MarketingKit.create(
          {
            name: displayName,
            file_type,
            file_path: uploaded.secure_url,
            cloudinary_public_id: uploaded.public_id,
            uploaded_by: req.user?.id || null,
          },
          { transaction }
        );
      } catch (dbError) {
        console.error('[createMarketingKit] DB insert gagal, cleanup Cloudinary:', uploaded.public_id);
        await cloudinary.uploader.destroy(uploaded.public_id, { resource_type: 'raw' }).catch(cleanupErr => console.error('[createMarketingKit] Cleanup gagal:', cleanupErr));
        throw dbError;
      }

      await newKit.setServices(service_ids, { transaction });
      createdKits.push({ ...newKit.toJSON(), file_url: uploaded.secure_url });
    }

    await transaction.commit();
    return res.status(201).json({
      success: true,
      pesan: `${createdKits.length} marketing kit berhasil diunggah`,
      data: createdKits,
    });
  } catch (err) {
    if (transaction) await transaction.rollback().catch(rbErr => console.error('[createMarketingKit] Rollback error:', rbErr.message));
    for (const publicId of uploadedPublicIds) {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }).catch(cleanupErr => console.error('[createMarketingKit] Cleanup gagal untuk', publicId, cleanupErr));
    }
    console.error('[createMarketingKit] Error:', err);
    return res.status(500).json({
      success: false,
      pesan: 'Terjadi kesalahan saat mengunggah marketing kit',
      ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
    });
  }
};

/**
 * PUT /api/marketing-kits/:id
 *
 * Update metadata marketing kit (nama, tipe file, layanan terkait) dan/atau file.
 * Jika file baru diupload, file lama di Cloudinary akan dihapus.
 */
exports.updateMarketingKit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, file_type, service_ids } = req.body;
    const file = req.file;

    const kit = await MarketingKit.findByPk(id);
    if (!kit) {
      if (file) await safeUnlink(file.path);
      return res.status(404).json({ success: false, error: 'Marketing kit tidak ditemukan' });
    }

    if (name !== undefined && name.trim()) {
      kit.name = name.trim();
    }
    if (file_type !== undefined) kit.file_type = file_type;

    if (file) {
      if (!isAllowedFile(file)) {
        await safeUnlink(file.path);
        return res.status(400).json({ success: false, error: `Format file tidak didukung: ${path.extname(file.originalname)}` });
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        await safeUnlink(file.path);
        return res.status(400).json({ success: false, error: `Ukuran file melebihi ${MAX_FILE_SIZE_MB} MB` });
      }

      let uploadResult;
      try {
        uploadResult = await cloudinary.uploader.upload(file.path, {
          resource_type: 'raw',
          folder: 'marketing_kits',
          use_filename: true,
          unique_filename: true,
        });
      } finally {
        await safeUnlink(file.path);
      }

      if (kit.cloudinary_public_id) {
        await cloudinary.uploader.destroy(kit.cloudinary_public_id, { resource_type: 'raw' }).catch(err => console.warn('Gagal hapus file lama Cloudinary:', err.message));
      }
      kit.file_path = uploadResult.secure_url;
      kit.cloudinary_public_id = uploadResult.public_id;
    }

    await kit.save();

    if (service_ids) {
      const serviceIdArray = Array.isArray(service_ids) ? service_ids : [service_ids];
      await kit.setServices(serviceIdArray);
    }

    const updatedKit = await getMarketingKitWithRelations(id);
    return res.json({
      success: true,
      data: updatedKit,
      message: 'Marketing kit berhasil diperbarui',
    });
  } catch (error) {
    console.error('[updateMarketingKit] Error:', error);
    if (req.file && req.file.path) await safeUnlink(req.file.path);
    return res.status(500).json({
      success: false,
      error: 'Gagal memperbarui marketing kit',
      ...(process.env.NODE_ENV === 'development' && { detail: error.message }),
    });
  }
};

/**
 * POST /api/marketing-kits/:id/download
 *
 * Generate signed Cloudinary URL (expire 60 detik) dan redirect client.
 * Mencatat setiap download ke tabel download_logs untuk audit trail.
 *
 * Validasi purpose wajib diisi sebelum membuat log download.
 */
exports.downloadMarketingKit = async (req, res) => {
  try {
    const { id } = req.params;
    const { purpose } = req.body;

    if (!purpose || !purpose.trim()) {
      return res.status(400).json({
        success: false,
        pesan: 'Alasan download (purpose) wajib diisi. Contoh: "Presentasi ke klien PT ABC"',
      });
    }

    const marketingKit = await MarketingKit.findByPk(id);
    if (!marketingKit) {
      return res.status(404).json({ success: false, pesan: 'Marketing kit tidak ditemukan' });
    }
    if (!marketingKit.cloudinary_public_id) {
      return res.status(500).json({ success: false, pesan: 'File tidak memiliki Public ID Cloudinary yang valid. Hubungi admin.' });
    }

    await DownloadLog.create({
      marketing_kit_id: id,
      user_id: req.user.id,
      purpose: purpose.trim(),
    });

    const fileExtension = path.extname(marketingKit.file_path || '').replace('.', '') || 'pdf';
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

    // Kembalikan JSON agar frontend bisa melakukan redirect
    return res.json({
      success: true,
      download_url: signedUrl,
    });
  } catch (error) {
    console.error('[downloadMarketingKit] Error:', error);
    return res.status(500).json({ success: false, pesan: 'Gagal mendownload marketing kit' });
  }
};

/**
 * DELETE /api/marketing-kits/:id
 *
 * Menghapus marketing kit dari database dan file dari Cloudinary.
 * Urutan: hapus Cloudinary dulu, lalu hapus record DB.
 * Jika Cloudinary gagal dihapus, tetap lanjutkan hapus DB (orphan file lebih baik dari data stale).
 */
exports.deleteMarketingKit = async (req, res) => {
  try {
    const marketingKit = await MarketingKit.findByPk(req.params.id);
    if (!marketingKit) {
      return res.status(404).json({ success: false, pesan: 'Marketing kit tidak ditemukan' });
    }

    if (marketingKit.cloudinary_public_id) {
      try {
        await cloudinary.uploader.destroy(marketingKit.cloudinary_public_id, { resource_type: 'raw' });
      } catch (cloudinaryErr) {
        console.warn('[deleteMarketingKit] Gagal hapus dari Cloudinary:', marketingKit.cloudinary_public_id, cloudinaryErr.message);
      }
    }

    const namaKit = marketingKit.name;
    await marketingKit.destroy();

    return res.json({
      success: true,
      pesan: `Marketing kit "${namaKit}" berhasil dihapus`,
    });
  } catch (error) {
    console.error('[deleteMarketingKit] Error:', error);
    return res.status(500).json({ success: false, pesan: 'Gagal menghapus marketing kit' });
  }
};