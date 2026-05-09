/**
 * models/sector.js
 *
 * Model untuk Sektor (bidang industri/pasar yang dilayani).
 * Sektor digunakan untuk mengklasifikasikan layanan berdasarkan industri.
 *
 * ============================================================
 * RELASI
 * ============================================================
 * - Sector.hasMany(SubSector) as 'sub_sectors' → sub sektor di dalam sektor ini
 * - Sector.belongsToMany(Service) through 'service_sectors' as 'services'
 *
 * ============================================================
 * PENGGUNAAN
 * ============================================================
 * Sektor dan sub sektor digunakan untuk memfilter layanan berdasarkan
 * bidang industri/pasar. Ditampilkan di dropdown filter pada halaman Daftar Layanan.
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Field `code` bersifat unik dan digunakan untuk sorting/identifikasi singkat.
 * - Jika sektor dihapus, sub sektor yang terkait akan ikut terhapus (CASCADE),
 *   namun relasi ke layanan (tabel pivot) harus dikelola dengan hati-hati.
 * - Pastikan ENUM tidak digunakan di sini (code adalah string).
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Sector extends Model {
    /**
     * Mendefinisikan asosiasi dengan model lain.
     * @param {Object} models - Semua model yang terdaftar
     */
    static associate(models) {
      // Sector memiliki banyak SubSector (one-to-many)
      Sector.hasMany(models.SubSector, { foreignKey: 'sector_id', as: 'sub_sectors' });
      // Many-to-many dengan Service melalui tabel pivot service_sectors
      Sector.belongsToMany(models.Service, {
        through: 'service_sectors',
        foreignKey: 'sector_id',
        otherKey: 'service_id',
        as: 'services',
        timestamps: true,
      });
    }
  }

  Sector.init(
    {
      /**
       * id - UUID primary key, tidak dapat di-enumerate.
       */
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        collate: 'utf8mb4_bin',
      },
      /**
       * name - Nama sektor (wajib, unik, maksimal 100 karakter).
       * Contoh: "Perbankan", "Energi", "Telekomunikasi", "Manufaktur".
       */
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      /**
       * code - Kode unik sektor untuk keperluan sorting dan referensi singkat.
       * Contoh: "BANK", "ENERGI", "TELCO", "MANUF".
       */
      code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
    },
    {
      sequelize,
      modelName: 'Sector',
      tableName: 'sectors',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Sector;
};