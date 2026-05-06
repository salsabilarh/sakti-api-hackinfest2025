/**
 * models/marketingKitService.js
 *
 * Model untuk tabel pivot many-to-many antara MarketingKit dan Service.
 * Menghubungkan marketing kit dengan layanan yang terkait.
 *
 * ============================================================
 * RELASI
 * ============================================================
 * - MarketingKit.belongsToMany(Service) melalui model ini
 * - Service.belongsToMany(MarketingKit) melalui model ini
 *
 * Tabel ini tidak memiliki primary key single column; menggunakan composite key
 * (marketing_kit_id, service_id) sebagai primary key.
 *
 * ============================================================
 * PENGGUNAAN
 * ============================================================
 * Model ini biasanya tidak diakses langsung, melainkan melalui
 * metode Sequelize seperti `marketingKit.addServices()` atau
 * `service.addMarketingKits()`.
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * Jangan menambahkan kolom tambahan ke tabel ini kecuali benar-benar diperlukan.
 * Jika diperlukan metadata relasi (misal: tanggal assignment), tambahkan field
 * baru dengan migrasi, lalu sesuaikan model dan controller.
 */

module.exports = (sequelize, DataTypes) => {
  const MarketingKitService = sequelize.define('MarketingKitService', {
    /**
     * marketing_kit_id - Foreign key ke tabel marketing_kits.
     * Bagian dari composite primary key.
     */
    marketing_kit_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'marketing_kits',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },

    /**
     * service_id - Foreign key ke tabel services.
     * Bagian dari composite primary key.
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
  }, {
    tableName: 'marketing_kit_services',
    timestamps: false,        // Tabel pivot tidak memerlukan timestamps
    underscored: true,        // gunakan snake_case untuk kolom
  });

  // Tidak perlu mendefinisikan associate karena relasi sudah
  // diatur melalui MarketingKit dan Service models.
  // Sequelize akan secara otomatis menghubungkan menggunakan through.

  return MarketingKitService;
};