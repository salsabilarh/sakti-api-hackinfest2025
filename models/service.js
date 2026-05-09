/**
 * models/service.js
 *
 * Model untuk Layanan (Service) — inti dari sistem SAKTI.
 * Sebuah layanan memiliki relasi ke Portfolio, SubPortfolio, Sektor, SubSektor,
 * Marketing Kit, dan data Revenue.
 *
 * ============================================================
 * PERBAIKAN DALAM FILE INI
 * ============================================================
 * [BUG #19] beforeCreate hook memiliki race condition pada auto-generate kode layanan.
 *   - Dua request bersamaan dapat membaca lastService yang sama → duplicate code.
 *   - Solusi: Gunakan `lock: transaction.LOCK.SHARE` untuk mengurangi window race.
 *   - Tambahkan guard jika kode sudah melewati 'Z' (maks 26 layanan per sub_portfolio).
 *   - Error duplicate key ditangani di controller dengan 409 Conflict.
 *
 * ============================================================
 * AUTO-GENERATE KODE LAYANAN
 * ============================================================
 * Format: `{subPortfolio.code}{huruf}` (contoh: 'SBU-AA', 'SBU-AB' ... 'SBU-AZ')
 * Huruf berurutan dari 'A' hingga 'Z' untuk setiap sub_portfolio.
 * Jika sudah mencapai 'Z' dan ingin menambah layanan lagi, admin harus memasukkan
 * kode secara manual (misal: 'SBU-BA').
 *
 * ============================================================
 * RELASI
 * ============================================================
 * - belongsTo Portfolio, SubPortfolio, Unit (sbu_owner), User (creator)
 * - belongsToMany Sector, SubSector, MarketingKit
 * - hasMany ServiceRevenue
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Field `sub_portfolio_code` mungkin redundan; sebaiknya dihapus karena kode
 *   layanan sudah di-generate dari sub_portfolio.code. Jika diperlukan untuk
 *   keperluan lain, pastikan diisi manual atau melalui hook.
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Service extends Model {
    static associate(models) {
      Service.belongsTo(models.Portfolio, { foreignKey: 'portfolio_id', as: 'portfolio' });
      Service.belongsTo(models.SubPortfolio, { foreignKey: 'sub_portfolio_id', as: 'sub_portfolio' });
      Service.belongsTo(models.Unit, { foreignKey: 'sbu_owner_id', as: 'sbu_owner' });
      Service.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });

      Service.belongsToMany(models.Sector, {
        through: 'service_sectors',
        foreignKey: 'service_id',
        otherKey: 'sector_id',
        as: 'sectors',
        timestamps: true,
      });
      Service.belongsToMany(models.SubSector, {
        through: 'service_sub_sectors',
        foreignKey: 'service_id',
        otherKey: 'sub_sector_id',
        as: 'sub_sectors',
        timestamps: true,
      });
      Service.hasMany(models.ServiceRevenue, { foreignKey: 'service_id', as: 'revenues' });
      Service.belongsToMany(models.MarketingKit, {
        through: 'marketing_kit_services',
        foreignKey: 'service_id',
        otherKey: 'marketing_kit_id',
        as: 'marketing_kits',
        timestamps: true,
      });
    }
  }

  Service.init(
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
       * name - Nama layanan (wajib, unik, maksimal 500 karakter).
       */
      name: {
        type: DataTypes.STRING(500),
        allowNull: false,
        unique: true,
      },
      /**
       * code - Kode unik layanan.
       * Di-generate otomatis dari sub_portfolio.code + huruf urutan (A-Z).
       * Bisa diisi manual untuk migrasi data atau jika auto-generate gagal.
       */
      code: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
      },
      /**
       * group - Grup layanan (misal: 'Core', 'Support', 'Development').
       */
      group: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      /**
       * overview - Ikhtisar layanan (deskripsi singkat).
       */
      overview: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      /**
       * scope - Ruang lingkup layanan.
       */
      scope: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      /**
       * benefit - Manfaat yang didapat klien.
       */
      benefit: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      /**
       * output - Hasil/output dari layanan.
       */
      output: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      /**
       * regulation_ref - Referensi regulasi yang mendasari (opsional).
       */
      regulation_ref: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      /**
       * intro_video_url - URL video pengantar (YouTube, Vimeo, dll).
       */
      intro_video_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      /**
       * sub_portfolio_code - (Opsional) Kode sub portfolio yang disimpan secara denormal.
       * Catatan: Field ini mungkin redundan karena kode layanan sudah di-generate.
       * Sebaiknya dihapus atau digunakan hanya untuk keperluan tertentu.
       */
      sub_portfolio_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Service',
      tableName: 'services',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  // beforeCreate hook: Auto-generate kode layanan jika tidak diisi manual
  Service.addHook('beforeCreate', async (service, options) => {
    if (service.code) return;

    const transaction = options.transaction;

    const subPortfolio = await sequelize.models.SubPortfolio.findByPk(
      service.sub_portfolio_id,
      { transaction }
    );

    if (!subPortfolio) {
      throw new Error('Sub portfolio tidak ditemukan. Kode layanan tidak dapat di-generate.');
    }

    // Ambil layanan terakhir di sub_portfolio yang sama
    // LOCK: SHARE untuk mengurangi race condition (dokumentasi [BUG #19])
    const lastService = await Service.findOne({
      where: { sub_portfolio_id: service.sub_portfolio_id },
      order: [['created_at', 'DESC']],
      lock: transaction ? transaction.LOCK.SHARE : undefined,
      transaction,
    });

    let nextChar = 'A';
    if (lastService && lastService.code) {
      const lastChar = lastService.code.charAt(lastService.code.length - 1);
      const nextCharCode = lastChar.charCodeAt(0) + 1;
      if (nextCharCode > 'Z'.charCodeAt(0)) {
        throw new Error(
          `Sub portfolio '${subPortfolio.code}' sudah mencapai batas 26 layanan (A-Z). ` +
          'Masukkan kode layanan secara manual.'
        );
      }
      nextChar = String.fromCharCode(nextCharCode);
    }

    service.code = `${subPortfolio.code}${nextChar}`;
  });

  return Service;
};