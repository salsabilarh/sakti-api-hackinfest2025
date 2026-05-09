/**
 * models/serviceRevenue.js
 *
 * Model untuk mencatat pendapatan (revenue) dari suatu layanan per pelanggan.
 * Digunakan oleh manajemen untuk melaporkan nilai kontrak dengan pelanggan.
 *
 * ============================================================
 * RELASI
 * ============================================================
 * - ServiceRevenue.belongsTo(Service) as 'service' → layanan terkait
 * - ServiceRevenue.belongsTo(Unit) as 'unit' → unit yang mencatat revenue
 *
 * ============================================================
 * PENGGUNAAN
 * ============================================================
 * - Manajemen menambahkan data revenue melalui POST /api/services/:id/revenue
 * - Data revenue ditampilkan di halaman detail layanan
 * - Digunakan untuk analisis pendapatan per layanan/per unit
 *
 * ============================================================
 * VALIDASI & KEAMANAN
 * ============================================================
 * - customer_name wajib diisi dan di-trim di controller
 * - revenue wajib diisi dan harus angka positif (validasi di controller)
 * - unit_id harus merujuk ke unit yang valid (FK)
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Jika struktur revenue berubah (misal: multi currency), tambahkan kolom currency.
 * - Pastikan revenue disimpan sebagai angka desimal dengan presisi 15,2 (cukup untuk miliaran).
 * - Hindari penghapusan data revenue lama jika diperlukan untuk laporan historis.
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ServiceRevenue extends Model {
    static associate(models) {
      ServiceRevenue.belongsTo(models.Service, { foreignKey: 'service_id', as: 'service' });
      ServiceRevenue.belongsTo(models.Unit, { foreignKey: 'unit_id', as: 'unit' });
    }
  }

  ServiceRevenue.init(
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
       * customer_name - Nama pelanggan (wajib, maksimal 255 karakter).
       * Contoh: "PT Sucofindo", "Bank Mandiri", "Telkom Indonesia".
       */
      customer_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      /**
       * revenue - Nilai pendapatan dalam Rupiah.
       * Tipe DECIMAL(15,2) mendukung hingga 999.999.999.999,99
       * Validasi angka positif dilakukan di controller.
       */
      revenue: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      /**
       * service_id - Foreign key ke services.id.
       * Layanan yang menghasilkan pendapatan ini.
       */
      service_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'services',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      /**
       * unit_id - Foreign key ke units.id.
       * Unit yang mencatat revenue ini (biasanya unit SBU).
       */
      unit_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'units',
          key: 'id',
        },
        onDelete: 'RESTRICT', // Jangan hapus unit jika masih ada revenue
        onUpdate: 'CASCADE',
      },
    },
    {
      sequelize,
      modelName: 'ServiceRevenue',
      tableName: 'service_revenues',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return ServiceRevenue;
};