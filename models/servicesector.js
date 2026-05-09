/**
 * models/serviceSector.js
 *
 * Model untuk tabel pivot many-to-many antara Service dan Sector.
 * Tabel ini menghubungkan layanan dengan sektor-sektor yang terkait.
 *
 * ============================================================
 * RELASI
 * ============================================================
 * - Service.belongsToMany(Sector) melalui model ini
 * - Sector.belongsToMany(Service) melalui model ini
 *
 * ============================================================
 * PENGGUNAAN
 * ============================================================
 * Model ini biasanya tidak diakses langsung, melainkan melalui
 * metode Sequelize seperti `service.addSectors()` atau
 * `sector.addServices()`.
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Jangan menambahkan kolom tambahan ke tabel ini kecuali benar-benar diperlukan.
 * - Tabel ini menggunakan composite primary key (service_id, sector_id).
 * - Timestamps (created_at, updated_at) disediakan untuk audit perubahan relasi.
 * - Jika ada kebutuhan metadata relasi (misal: tanggal assignment), buat migrasi baru.
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ServiceSector extends Model {
    /**
     * Mendefinisikan asosiasi dengan model lain.
     * Untuk pivot many-to-many, asosiasi didefinisikan di model Service dan Sector.
     *
     * @param {Object} models - Semua model yang terdaftar
     */
    static associate(models) {
      // Asosiasi tidak perlu didefinisikan di sini karena sudah ditangani
      // oleh belongsToMany di model Service dan Sector.
    }
  }

  ServiceSector.init(
    {
      /**
       * service_id - Foreign key ke tabel services.
       * Bagian dari composite primary key.
       * CATATAN: JANGAN beri defaultValue UUIDV4 karena nilai harus berasal dari service yang ada.
       */
      service_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        references: {
          model: 'services',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      /**
       * sector_id - Foreign key ke tabel sectors.
       * Bagian dari composite primary key.
       */
      sector_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        references: {
          model: 'sectors',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
    },
    {
      sequelize,
      modelName: 'ServiceSector',
      tableName: 'service_sectors',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return ServiceSector;
};