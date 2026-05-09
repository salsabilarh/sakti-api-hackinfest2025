/**
 * models/serviceSubSector.js
 *
 * Model untuk tabel pivot many-to-many antara Service dan SubSector.
 * Tabel ini menghubungkan layanan dengan sub sektor-sub sektor yang terkait.
 *
 * ============================================================
 * RELASI
 * ============================================================
 * - Service.belongsToMany(SubSector) melalui model ini
 * - SubSector.belongsToMany(Service) melalui model ini
 *
 * ============================================================
 * PENGGUNAAN
 * ============================================================
 * Model ini biasanya tidak diakses langsung, melainkan melalui
 * metode Sequelize seperti `service.addSub_sectors()` atau
 * `subSector.addServices()`.
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Jangan menambahkan kolom tambahan ke tabel ini kecuali benar-benar diperlukan.
 * - Tabel ini menggunakan composite primary key (service_id, sub_sector_id).
 * - Timestamps (created_at, updated_at) disediakan untuk audit perubahan relasi.
 * - Hapus defaultValue UUIDV4 pada service_id karena nilai harus berasal dari service yang ada.
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ServiceSubSector extends Model {
    /**
     * Mendefinisikan asosiasi dengan model lain.
     * Untuk pivot many-to-many, asosiasi didefinisikan di model Service dan SubSector.
     *
     * @param {Object} models - Semua model yang terdaftar
     */
    static associate(models) {
      // Asosiasi tidak perlu didefinisikan di sini karena sudah ditangani
      // oleh belongsToMany di model Service dan SubSector.
    }
  }

  ServiceSubSector.init(
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
       * sub_sector_id - Foreign key ke tabel sub_sectors.
       * Bagian dari composite primary key.
       */
      sub_sector_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        references: {
          model: 'sub_sectors',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
    },
    {
      sequelize,
      modelName: 'ServiceSubSector',
      tableName: 'service_sub_sectors',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return ServiceSubSector;
};