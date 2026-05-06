/**
 * controllers/marketingKitController.js
 *
 * Mengelola operasi CRUD Marketing Kit:
 * - Upload file ke Cloudinary (multiple file sekaligus)
 * - Download dengan signed URL (expire 60 detik)
 * - Pencatatan log download untuk audit trail
 *
 * Seluruh endpoint dilindungi oleh middleware autentikasi.
 * Endpoint create/update/delete memerlukan role 'management' atau 'admin'.
 *
 * ============================================================
 * ARSITEKTUR DOWNLOAD
 * ============================================================
 * POST /api/marketing-kits/:id/download
 *   1. Validasi purpose (wajib diisi) → [Fix N29]
 *   2. Cari marketing kit di DB
 *   3. Catat DownloadLog ke DB
 *   4. Generate signed Cloudinary URL (expire 60 detik)
 *   5. Redirect client ke URL tersebut
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
const fs = require('fs').promises;   // Promise-based API, BUKAN callback
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
 *
 * Mendukung:
 * - Array: service_ids[]=a&service_ids[]=b
 * - JSON string: '["a","b"]'
 * - Comma-separated: "a,b,c"
 * - Single string: "a"
 *
 * @param {any} input - req.body.service_ids atau req.body['service_ids[]']
 * @returns {string[]} Array of service ID (unique)
 */
function normalizeServiceIds(input) {
  if (!input) return [];
  if (Array.isArray(input)) return [...new Set(input.map(String))];
  if (typeof input === 'string') {
    const s = input.trim();
    // Coba parse sebagai JSON
    if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('"') && s.endsWith('"'))) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return [...new Set(parsed.map(String))];
        return parsed ? [String(parsed)] : [];
      } catch {
        // Bukan JSON, lanjut ke parsing berikutnya
      }
    }
    // Comma-separated
    if (s.includes(',')) {
      return [...new Set(s.split(',').map(v => v.trim()).filter(Boolean))];
    }
    return [s];
  }
  return [];
}

/**
 * Validasi file berdasarkan MIME type dan ekstensi.
 * (OR logic karena beberapa browser mengirim `application/octet-stream`)
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
 *
 * [Fix #8] SELALU gunakan fungsi ini, BUKAN fs.unlink(path, callback).
 * Bug lama: updateMarketingKit menggunakan callback-style pada fs.promises.
 *
 * @param {string|null} filePath - Path file yang akan dihapus
 */
async function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {
    // Abaikan error (file mungkin sudah tidak ada)
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
 * Digunakan di getById dan sebagai response setelah create/update.
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
        through: { attributes: [] }, // sembunyikan pivot
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
 * Mendapatkan daftar semua marketing kit dengan filter opsional:
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
      subQuery: false, // penting agar WHERE pada relasi bekerja
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
 * Mendapatkan detail satu marketing kit beserta layanan dan uploader.
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
 *
 * Alur per file:
 * 1. Validasi ukuran & tipe file
 * 2. Upload ke Cloudinary (resource_type: raw)
 * 3. Hapus file temp dari disk
 * 4. Simpan record ke DB (dalam transaksi)
 * 5. Kaitkan dengan service_ids
 * 6. Jika DB gagal, hapus file dari Cloudinary (orphan cleanup)
 *
 * [Fix N39] Cleanup Cloudinary jika DB INSERT gagal.
 */
exports.createMarketingKit = async (req, res) => {
  let transaction;
  const uploadedPublicIds = []; // track untuk cleanup jika gagal

  try {
    const files = req.files;
    const rawServiceIds = req.body?.service_ids || req.body?.['service_ids[]'];
    const service_ids = normalizeServiceIds(rawServiceIds);

    let fileTypes = req.body?.file_types || req.body?.['file_types[]'] || [];
    if (!Array.isArray(fileTypes)) fileTypes = [fileTypes];

    // Validasi input dasar
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        pesan: 'Minimal satu file harus diunggah',
      });
    }
    if (!service_ids.length) {
      return res.status(400).json({
        success: false,
        pesan: 'Minimal satu layanan harus dipilih',
      });
    }
    if (fileTypes.length !== files.length) {
      return res.status(400).json({
        success: false,
        pesan: 'Jumlah tipe file tidak sesuai jumlah file yang diunggah',
      });
    }

    // Validasi semua service_ids ada di DB
    const servicesCount = await Service.count({ where: { id: service_ids } });
    if (servicesCount !== service_ids.length) {
      return res.status(400).json({
        success: false,
        pesan: 'Terdapat ID layanan yang tidak valid. Periksa kembali pilihan layanan.',
      });
    }

    if (!ensureCloudinaryConfigured()) {
      return res.status(500).json({
        success: false,
        pesan: 'Konfigurasi Cloudinary tidak lengkap. Hubungi admin sistem.',
      });
    }

    transaction = await sequelize.transaction();
    const createdKits = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const file_type = (fileTypes[i] || '').trim();

      if (!file_type) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          pesan: `Tipe file wajib dipilih untuk file: ${file.originalname}`,
        });
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          pesan: `File "${file.originalname}" melebihi batas ukuran ${MAX_FILE_SIZE_MB} MB`,
        });
      }

      if (!isAllowedFile(file)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          pesan: `Format file tidak didukung: ${path.extname(file.originalname)}. Hanya PDF, DOC, DOCX, PPT, PPTX yang diperbolehkan.`,
        });
      }

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
        // Hapus file temp selalu, terlepas dari sukses/gagal upload
        await safeUnlink(file.path);
      }

      let newKit;
      try {
        newKit = await MarketingKit.create(
          {
            name: path.parse(file.originalname).name,
            file_type,
            file_path: uploaded.secure_url,
            cloudinary_public_id: uploaded.public_id,
            uploaded_by: req.user?.id || null,
          },
          { transaction }
        );
      } catch (dbError) {
        // [Fix N39] Cleanup Cloudinary jika DB insert gagal
        console.error('[createMarketingKit] DB insert gagal, cleanup Cloudinary:', uploaded.public_id);
        await cloudinary.uploader.destroy(uploaded.public_id, { resource_type: 'raw' })
          .catch(cleanupErr => console.error('[createMarketingKit] Cleanup gagal:', cleanupErr));
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
    if (transaction) {
      try { await transaction.rollback(); } catch (rbErr) {
        console.error('[createMarketingKit] Rollback error:', rbErr.message);
      }
    }
    // Cleanup semua file yang sudah terupload ke Cloudinary
    for (const publicId of uploadedPublicIds) {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
        .catch(cleanupErr => console.error('[createMarketingKit] Cleanup gagal untuk', publicId, cleanupErr));
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
 * Memperbarui metadata marketing kit (file_type, service_ids) dan/atau mengganti file.
 *
 * [Fix #8] Menggunakan safeUnlink() yang async/await.
 * [Fix N39] Cleanup Cloudinary jika setelah upload baru, DB save gagal.
 */
exports.updateMarketingKit = async (req, res) => {
  let newPublicId = null; // untuk cleanup jika DB gagal

  try {
    const { id } = req.params;
    const { file_type } = req.body;
    let service_ids = req.body.service_ids || [];
    if (!Array.isArray(service_ids)) service_ids = [service_ids];

    const file = req.file;
    const marketingKit = await MarketingKit.findByPk(id);

    if (!marketingKit) {
      if (file) await safeUnlink(file.path);
      return res.status(404).json({
        success: false,
        pesan: 'Marketing kit tidak ditemukan',
      });
    }

    // Jika ada file baru, upload ke Cloudinary
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        await safeUnlink(file.path);
        return res.status(400).json({
          success: false,
          pesan: `Ukuran file maksimal ${MAX_FILE_SIZE_MB} MB`,
        });
      }

      let uploadResult;
      try {
        // Hapus file lama dari Cloudinary
        if (marketingKit.cloudinary_public_id) {
          await cloudinary.uploader.destroy(marketingKit.cloudinary_public_id, { resource_type: 'raw' });
        }
        uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: 'marketing_kits',
          resource_type: 'raw',
        });
        newPublicId = uploadResult.public_id;

        marketingKit.file_path = uploadResult.secure_url;
        marketingKit.cloudinary_public_id = uploadResult.public_id;
        marketingKit.name = path.parse(file.originalname).name;
      } catch (uploadErr) {
        console.error('[updateMarketingKit] Upload error:', uploadErr.message);
        return res.status(500).json({
          success: false,
          pesan: 'Gagal mengunggah file baru',
          ...(process.env.NODE_ENV === 'development' && { detail: uploadErr.message }),
        });
      } finally {
        await safeUnlink(file.path);
      }
    }

    if (file_type) marketingKit.file_type = file_type;

    try {
      await marketingKit.save();
    } catch (saveErr) {
      // [Fix N39] DB save gagal, hapus file baru dari Cloudinary
      if (newPublicId) {
        await cloudinary.uploader.destroy(newPublicId, { resource_type: 'raw' })
          .catch(cleanupErr => console.error('[updateMarketingKit] Cleanup gagal:', cleanupErr));
      }
      throw saveErr;
    }

    // Update relasi service jika ada perubahan
    if (service_ids.length > 0) {
      await marketingKit.setServices(service_ids);
    }

    const updatedKit = await getMarketingKitWithRelations(id);
    return res.json({
      success: true,
      pesan: 'Marketing kit berhasil diperbarui',
      data: updatedKit,
    });
  } catch (error) {
    console.error('[updateMarketingKit] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Terjadi kesalahan saat memperbarui marketing kit',
      ...(process.env.NODE_ENV === 'development' && { detail: error.message }),
    });
  }
};

/**
 * POST /api/marketing-kits/:id/download
 *
 * Menghasilkan signed URL Cloudinary (expire 60 detik) dan redirect client.
 * Mencatat setiap download ke tabel download_logs.
 *
 * [Fix N29] Validasi purpose wajib diisi sebelum membuat log download.
 *
 * Alur:
 * 1. Validasi purpose tidak kosong → 400 jika kosong
 * 2. Cari marketing kit (404 jika tidak ditemukan)
 * 3. Buat record DownloadLog
 * 4. Generate signed URL dengan masa berlaku 60 detik
 * 5. Redirect ke URL tersebut
 */
exports.downloadMarketingKit = async (req, res) => {
  try {
    const { id } = req.params;
    const { purpose } = req.body;

    // [Fix N29] Validasi purpose di awal
    if (!purpose || !purpose.trim()) {
      return res.status(400).json({
        success: false,
        pesan: 'Alasan download (purpose) wajib diisi. Contoh: "Presentasi ke klien PT ABC"',
      });
    }

    const marketingKit = await MarketingKit.findByPk(id);
    if (!marketingKit) {
      return res.status(404).json({
        success: false,
        pesan: 'Marketing kit tidak ditemukan',
      });
    }

    if (!marketingKit.cloudinary_public_id) {
      return res.status(500).json({
        success: false,
        pesan: 'File tidak memiliki Public ID Cloudinary yang valid. Hubungi admin.',
      });
    }

    // Catat log download
    await DownloadLog.create({
      marketing_kit_id: id,
      user_id: req.user.id,
      purpose: purpose.trim(),
    });

    // Ekstensi file untuk signed URL
    const fileExtension = path.extname(marketingKit.file_path || '').replace('.', '') || 'pdf';
    const downloadFilename = marketingKit.name || 'file';

    // Signed URL berlaku 60 detik
    const signedUrl = cloudinary.utils.private_download_url(
      marketingKit.cloudinary_public_id,
      fileExtension,
      {
        resource_type: 'raw',
        type: 'upload',
        expires_at: Math.floor(Date.now() / 1000) + 60, // 60 detik
        attachment: downloadFilename,
      }
    );

    return res.redirect(signedUrl);
  } catch (error) {
    console.error('[downloadMarketingKit] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mendownload marketing kit',
    });
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
      return res.status(404).json({
        success: false,
        pesan: 'Marketing kit tidak ditemukan',
      });
    }

    // Hapus dari Cloudinary (jika gagal, log peringatan)
    if (marketingKit.cloudinary_public_id) {
      try {
        await cloudinary.uploader.destroy(marketingKit.cloudinary_public_id, { resource_type: 'raw' });
      } catch (cloudinaryErr) {
        console.warn('[deleteMarketingKit] Gagal hapus dari Cloudinary:', marketingKit.cloudinary_public_id, cloudinaryErr.message);
        // Jangan hentikan proses, lanjut hapus DB
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
    return res.status(500).json({
      success: false,
      pesan: 'Gagal menghapus marketing kit',
    });
  }
};