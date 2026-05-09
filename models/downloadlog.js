/**
 * models/downloadLog.js
 *
 * Model untuk mencatat log setiap kali user mengunduh marketing kit.
 * Digunakan untuk audit trail dan analisis penggunaan materi pemasaran.
 *
 * ============================================================
 * RELASI
 * ============================================================
 * - DownloadLog.belongsTo(MarketingKit) as 'marketing_kit'
 * - DownloadLog.belongsTo(User) as 'user'
 *
 * ============================================================
 * ALUR PENCATATAN LOG
 * ============================================================
 * 1. User request download ke POST /api/marketing-kits/:id/download
 * 2. Controller memvalidasi purpose (wajib diisi)
 * 3. Setelah valid, buat record DownloadLog dengan:
 *    - marketing_kit_id: ID kit yang diunduh
 *    - user_id: ID user yang mengunduh
 *    - purpose: alasan download (diisi user)
 *    - created_at: waktu download (otomatis)
 * 4. Log dicatat, kemudian file diunduh
 *
 * ============================================================
 * KEAMANAN & VALIDASI
 * ============================================================
 * - purpose wajib diisi (allowNull: false) sesuai keputusan bisnis
 * - createdAt otomatis oleh Sequelize, updatedAt dimatikan karena log
 *   tidak pernah diupdate setelah dibuat.
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Tabel ini dapat tumbuh besar seiring waktu. Pertimbangkan:
 *   * Membuat index pada foreign key (marketing_kit_id, user_id) dan created_at
 *   * Menjadwalkan job pembersihan log lama (misal > 1 tahun) jika diperlukan
 * - Jika ada kebutuhan agregasi statistik download, query langsung ke tabel ini.
 * - Jangan menambah field baru tanpa migrasi yang sesuai.
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DownloadLog extends Model {
    static associate(models) {
      DownloadLog.belongsTo(models.MarketingKit, { foreignKey: 'marketing_kit_id', as: 'marketing_kit' });
      DownloadLog.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  DownloadLog.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      collate: 'utf8mb4_bin'
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'DownloadLog',
    tableName: 'download_logs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false  // table does NOT have updated_at
  });

  return DownloadLog;
};