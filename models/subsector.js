/**
 * models/subSector.js
 *
 * Model untuk Sub Sektor — spesialisasi lebih dalam dari suatu Sektor.
 * Sub sektor digunakan untuk mengklasifikasikan layanan secara lebih granular.
 *
 * ============================================================
 * RELASI
 * ============================================================
 * - SubSector.belongsTo(Sector) as 'sector' → sektor induk
 * - SubSector.belongsToMany(Service) through 'service_sub_sectors' as 'services'
 *
 * ============================================================
 * PENGGUNAAN
 * ============================================================
 * Sub sektor ditampilkan di halaman detail layanan dan dapat digunakan
 * sebagai filter lanjutan pada pencarian layanan.
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - `code` harus unik (global) karena digunakan untuk identifikasi singkat.
 * - Jika sub sektor dihapus, relasi many-to-many dengan service akan ikut terhapus
 *   (CASCADE pada tabel pivot).
 * - Pastikan foreign key `sector_id` selalu mengacu ke sector yang valid.
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SubSector extends Model {
    static associate(models) {
      // SubSector milik satu Sector (parent)
      SubSector.belongsTo(models.Sector, { foreignKey: 'sector_id', as: 'sector' });
      // Many-to-many dengan Service melalui tabel pivot service_sub_sectors
      SubSector.belongsToMany(models.Service, {
        through: 'service_sub_sectors',
        foreignKey: 'sub_sector_id',
        otherKey: 'service_id',
        as: 'services',
        timestamps: true,
      });
    }
  }

  SubSector.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        collate: 'utf8mb4_bin',
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      sector_id: {
        type: DataTypes.UUID,
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
      modelName: 'SubSector',
      tableName: 'sub_sectors',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return SubSector;
};