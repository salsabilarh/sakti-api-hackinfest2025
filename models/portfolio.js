/**
 * models/portfolio.js
 *
 * Model untuk Portfolio (kategori tingkat atas layanan).
 * Sebuah portfolio dapat memiliki banyak sub_portfolio dan banyak layanan.
 *
 * ============================================================
 * RELASI
 * ============================================================
 * - Portfolio.hasMany(SubPortfolio) as 'sub_portfolios' → sub portfolio di dalam portfolio
 * - Portfolio.hasMany(Service) as 'services' → layanan yang terkait dengan portfolio ini
 *
 * ============================================================
 * PENGGUNAAN
 * ============================================================
 * Portfolio digunakan untuk mengelompokkan layanan-layanan dalam sistem SAKTI.
 * Biasanya ditampilkan di dropdown filter pada halaman Daftar Layanan.
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Field `name` bersifat unik, jangan membuat dua portfolio dengan nama sama.
 * - Jika ada portfolio yang dihapus dan masih digunakan oleh layanan, operasi akan gagal
 *   karena foreign key constraint. Pastikan tidak ada layanan yang terkait sebelum hapus,
 *   atau atur onDelete di migrasi menjadi CASCADE/SET NULL sesuai kebutuhan.
 * - Pastikan kode dan migrasi konsisten: migration menggunakan table `portfolios`,
 *   kolom `name` dengan panjang 100 (di model 50). Sesuaikan jika perlu.
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Portfolio extends Model {
    static associate(models) {
      // Portfolio memiliki banyak sub portfolio (one-to-many)
      Portfolio.hasMany(models.SubPortfolio, { foreignKey: 'portfolio_id', as: 'sub_portfolios' });
      // Portfolio memiliki banyak layanan (one-to-many)
      Portfolio.hasMany(models.Service, { foreignKey: 'portfolio_id', as: 'services' });
    }
  }

  Portfolio.init(
    {
      /**
       * id - UUID primary key, tidak dapat di-enumerate.
       */
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        collate: 'utf8mb4_bin',
      },
      /**
       * name - Nama portfolio (wajib, unik, maksimal 50 karakter).
       * Contoh: "Digital Transformation", "Cybersecurity", "Mobile Solutions".
       */
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
    },
    {
      sequelize,
      modelName: 'Portfolio',
      tableName: 'portfolios',
      underscored: true,           // gunakan snake_case untuk kolom
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Portfolio;
};