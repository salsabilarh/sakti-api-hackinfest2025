/**
 * models/unit.js
 *
 * Model untuk Unit Kerja organisasi.
 * Unit menentukan hak akses user bersama dengan role (via authorizeAdvanced middleware).
 *
 * ============================================================
 * RELASI
 * ============================================================
 * - Unit.hasMany(User) → user yang bekerja di unit ini
 * - Unit.hasMany(Service) → layanan yang dimiliki unit (sebagai pemilik/SBU)
 * - Unit.hasMany(ServiceRevenue) → revenue yang dicatat oleh unit ini
 * - Unit.hasMany(ChangeRequest) as 'currentUnitRequests' → permintaan pindah dari unit ini
 * - Unit.hasMany(ChangeRequest) as 'requestedUnitRequests' → permintaan pindah ke unit ini
 *
 * ============================================================
 * TIPE UNIT (ENUM)
 * ============================================================
 * Jenis unit yang tersedia (harus sinkron dengan validasi di controller dan frontend):
 *   - sbu      : Strategic Business Unit
 *   - ppk      : Pusat Pengendalian Kegiatan (atau unit setara)
 *   - cabang   : Cabang perusahaan
 *   - unit     : Unit biasa
 *   - divisi   : Divisi dalam perusahaan
 *   - lainnya  : Tipe lain yang tidak termasuk di atas
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Field `code` opsional, namun jika diisi harus unik.
 * - Jika unit dihapus dan masih memiliki user, akan ditolak oleh DB (RESTRICT).
 * - Ganti nilai ENUM memerlukan migrasi baru; jangan ubah langsung di model tanpa
 *   mengubah ENUM di database.
 * - Lihat juga `WRITE_UNIT_TYPES` di constants frontend untuk sinkronisasi.
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Unit extends Model {
    static associate(models) {
      // User yang terdaftar di unit ini (FK: unit_kerja_id)
      Unit.hasMany(models.User, { foreignKey: 'unit_kerja_id' });
      // Layanan yang dimiliki oleh unit ini sebagai SBU owner
      Unit.hasMany(models.Service, { foreignKey: 'sbu_owner_id' });
      // Pendapatan yang dicatat oleh unit ini
      Unit.hasMany(models.ServiceRevenue, { foreignKey: 'unit_id' });
      // Permintaan perubahan di mana unit ini adalah unit saat ini (dari)
      Unit.hasMany(models.ChangeRequest, { foreignKey: 'current_unit_id', as: 'currentUnitRequests' });
      // Permintaan perubahan di mana unit ini adalah unit tujuan (ke)
      Unit.hasMany(models.ChangeRequest, { foreignKey: 'requested_unit_id', as: 'requestedUnitRequests' });
    }
  }

  Unit.init(
    {
      /**
       * id - UUID primary key, tidak dapat di-enumerate.
       */
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        collate: 'utf8mb4_bin',
        defaultValue: DataTypes.UUIDV4,
      },
      /**
       * name - Nama unit kerja (wajib, maksimal 100 karakter).
       * Contoh: "SBU Industri", "PPK Pusat", "Cabang Surabaya".
       */
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      /**
       * type - Klasifikasi unit dalam organisasi (ENUM).
       * Menentukan hak akses bersama role (via authorizeAdvanced middleware).
       */
      type: {
        type: DataTypes.ENUM('sbu', 'ppk', 'cabang', 'unit', 'divisi', 'lainnya'),
        allowNull: false,
      },
      /**
       * code - Kode singkat unit (opsional, unik, maks 20 karakter).
       * Contoh: "SBU-1", "PPK-JKT", "DIV-IT".
       */
      code: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Unit',
      tableName: 'units',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Unit;
};