/**
 * models/subPortfolio.js
 *
 * Model untuk Sub Portfolio — sub-kategori di bawah Portfolio.
 * Sub portfolio digunakan untuk mengelompokkan layanan secara lebih spesifik
 * dalam suatu portfolio.
 *
 * ============================================================
 * RELASI
 * ============================================================
 * - SubPortfolio.belongsTo(Portfolio) as 'portfolio' → portfolio induk
 * - SubPortfolio.hasMany(Service) as 'services' → layanan yang menggunakan sub portfolio ini
 *
 * ============================================================
 * PENGGUNAAN
 * ============================================================
 * Sub portfolio ditampilkan di dropdown filter pada halaman Daftar Layanan,
 * dan digunakan sebagai salah satu komponen dalam pembangkitan kode layanan
 * (service.code = `${subPortfolio.code}${hurufUrutan}`).
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - `code` harus unik dan digunakan untuk auto-generate kode layanan.
 * - Jika code berubah, pastikan kode layanan yang sudah ada tidak terdampak
 *   (kode layanan tidak otomatis diupdate).
 * - Sub portfolio yang dihapus akan menghapus semua layanan yang terkait
 *   (set onDelete di migration harus CASCADE atau SET NULL sesuai kebutuhan).
 * - Pastikan field `name` dan `code` adalah unik di seluruh tabel.
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SubPortfolio extends Model {
    static associate(models) {
      // SubPortfolio milik satu Portfolio (parent)
      SubPortfolio.belongsTo(models.Portfolio, { foreignKey: 'portfolio_id', as: 'portfolio' });
      // SubPortfolio dapat memiliki banyak Service
      SubPortfolio.hasMany(models.Service, { foreignKey: 'sub_portfolio_id', as: 'services' });
    }
  }

  SubPortfolio.init(
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
       * name - Nama sub portfolio (wajib, unik, maksimal 255 karakter).
       * Contoh: "Layanan Digital", "Keamanan Siber", "Infrastruktur TI".
       */
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      /**
       * code - Kode unik sub portfolio (wajib, maksimal 20 karakter).
       * Digunakan untuk auto-generate kode layanan.
       * Contoh: "SBU-A", "PPK-01", "DIG-01".
       */
      code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      /**
       * portfolio_id - Foreign key ke portfolios.id (portfolio induk).
       */
      portfolio_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'portfolios',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
    },
    {
      sequelize,
      modelName: 'SubPortfolio',
      tableName: 'sub_portfolios',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return SubPortfolio;
};