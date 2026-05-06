/**
 * models/marketingKit.js
 *
 * Model untuk Marketing Kit — file dokumen (PDF, DOC, PPTX, dll) yang dapat diunduh oleh user.
 * File disimpan di Cloudinary dengan resource_type 'raw'.
 *
 * ============================================================
 * RELASI
 * ============================================================
 * - MarketingKit.belongsTo(User) as 'uploader' (uploader dapat dihapus → SET NULL)
 * - MarketingKit.belongsToMany(Service) through 'MarketingKitService'
 * - MarketingKit.hasMany(DownloadLog) as 'download_logs'
 *
 * ============================================================
 * ALUR UPLOAD FILE
 * ============================================================
 * 1. Multer simpan file sementara di disk (uploads/)
 * 2. Controller upload ke Cloudinary → dapat cloudinary_public_id dan secure_url
 * 3. Controller buat record MarketingKit di DB
 * 4. Hapus file temp dari disk
 * 5. Jika DB INSERT gagal setelah Cloudinary upload berhasil → controller cleanup
 *
 * [Fix N39] cloudinary_public_id tetap NOT NULL untuk integritas data,
 * namun controller bertanggung jawab membersihkan orphan file jika DB gagal.
 *
 * ============================================================
 * ALUR DOWNLOAD (Signed URL)
 * ============================================================
 * 1. User POST /api/marketing-kits/:id/download dengan purpose (opsional)
 * 2. Controller generate signed URL via cloudinary.utils.private_download_url
 * 3. Signed URL berlaku 60 detik, kemudian redirect
 * 4. DownloadLog dicatat ke database
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - file_type bersifat deskriptif bisnis (contoh: 'Brosur', 'Proposal'),
 *   bukan tipe teknis (pdf/docx) — itu bisa diambil dari ekstensi file_path.
 * - Jika Cloudinary diganti dengan provider lain (S3, GCS), ubah field
 *   cloudinary_public_id menjadi storage_key, dan sesuaikan controller.
 * - Saat menghapus marketing kit, pastikan file di Cloudinary juga dihapus
 *   (sudah dilakukan di controller deleteMarketingKit).
 */

module.exports = (sequelize, DataTypes) => {
  const MarketingKit = sequelize.define('MarketingKit', {
    /**
     * id - UUID primary key, tidak dapat di-enumerate.
     */
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },

    /**
     * name - Nama tampilan marketing kit.
     * Default diambil dari nama file upload (tanpa ekstensi), dapat diupdate manual.
     */
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    /**
     * file_type - Kategori bisnis marketing kit.
     * Contoh: 'Brosur', 'Proposal', 'Presentasi', 'Laporan', 'Datasheet'
     * BUKAN tipe teknis (pdf/docx) — itu bisa dilihat dari ekstensi file_path.
     */
    file_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    /**
     * file_path - URL publik ke file di Cloudinary.
     * Ini hanya untuk referensi visual, BUKAN link download langsung.
     * Download menggunakan signed URL yang di-generate via controller.
     */
    file_path: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    /**
     * cloudinary_public_id - Identifier unik di Cloudinary.
     * Wajib diisi karena dipakai untuk generate signed URL dan menghapus file.
     * NOT NULL menjaga integritas: setiap marketing kit pasti punya file di Cloudinary.
     * [Fix N39] Jika DB insert gagal setelah Cloudinary upload, controller akan cleanup.
     */
    cloudinary_public_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },

    /**
     * uploaded_by - ID user yang mengupload (FK ke users.id).
     * Nullable karena mungkin ada data lama tanpa pencatat uploader.
     * Jika user dihapus, field ini di-set NULL (bukan CASCADE DELETE).
     */
    uploaded_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
  }, {
    tableName: 'marketing_kits',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  MarketingKit.associate = (models) => {
    // Uploader (user yang mengupload)
    MarketingKit.belongsTo(models.User, {
      foreignKey: 'uploaded_by',
      as: 'uploader',
    });

    // Many-to-many dengan Service (pivot: marketing_kit_services)
    MarketingKit.belongsToMany(models.Service, {
      through: models.MarketingKitService,
      foreignKey: 'marketing_kit_id',
      otherKey: 'service_id',
      as: 'services',
    });

    // Log download (audit trail)
    MarketingKit.hasMany(models.DownloadLog, {
      foreignKey: 'marketing_kit_id',
      as: 'download_logs',
    });
  };

  return MarketingKit;
};