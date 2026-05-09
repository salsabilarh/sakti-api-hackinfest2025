/**
 * models/user.js
 *
 * Model utama untuk data pengguna sistem SAKTI.
 * Mengelola informasi akun, autentikasi, otorisasi, dan relasi dengan entitas lain.
 *
 * ============================================================
 * FIELD PENTING
 * ============================================================
 * - password          : hash Argon2, TIDAK pernah dikembalikan ke client (defaultScope)
 * - temporary_password : AES-256-CBC encrypted, hanya untuk password sementara
 * - is_verified       : null = pending, true = approved, false = rejected
 * - is_active         : false = akun dinonaktifkan admin
 *
 * ============================================================
 * SCOPE
 * ============================================================
 * - defaultScope      : exclude field sensitif (password, token, temporary_password)
 * - withPassword      : kembalikan SEMUA field (hanya untuk login/update password)
 * - publicProfile     : hanya id, full_name, email, role (untuk tampilan publik)
 *
 * ============================================================
 * RELASI
 * ============================================================
 * - belongsTo Unit (unit kerja)
 * - hasMany DownloadLog, MarketingKit, Service, PasswordResetRequest,
 *   RefreshToken, ChangeRequest
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Jangan pernah menghapus defaultScope tanpa mempertimbangkan keamanan data.
 * - Saat menambah field sensitif baru, tambahkan ke exclude di defaultScope.
 * - Gunakan User.scope('withPassword') HANYA untuk keperluan autentikasi.
 * - Gunakan User.unscoped() jika perlu mengakses temporary_password (lihat adminController).
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Unit kerja (bisa null untuk admin)
      User.belongsTo(models.Unit, { foreignKey: 'unit_kerja_id', as: 'unit' });

      // Log aktivitas download
      User.hasMany(models.DownloadLog, { foreignKey: 'user_id', as: 'download_logs' });

      // Marketing kit yang diupload oleh user
      User.hasMany(models.MarketingKit, { foreignKey: 'uploaded_by', as: 'marketing_kits' });

      // Layanan yang dibuat oleh user
      User.hasMany(models.Service, { foreignKey: 'created_by', as: 'services' });

      // Permintaan reset password (sebagai pemohon)
      User.hasMany(models.PasswordResetRequest, { foreignKey: 'user_id', as: 'password_reset_requests' });

      // Permintaan reset password (sebagai pemroses/admin)
      User.hasMany(models.PasswordResetRequest, { foreignKey: 'processed_by', as: 'processed_password_reset_requests' });

      // Refresh token untuk multiple device
      User.hasMany(models.RefreshToken, { foreignKey: 'user_id', as: 'refresh_tokens' });

      // Permintaan perubahan role/unit
      User.hasMany(models.ChangeRequest, { foreignKey: 'user_id', as: 'change_requests' });
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        collate: 'utf8mb4_bin',
      },
      full_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING(15),
        allowNull: false,
        defaultValue: 'viewer',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      last_login: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reset_token: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      reset_token_expires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      temporary_password: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      unit_kerja_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'units',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      defaultScope: {
        attributes: { exclude: ['password', 'reset_token', 'reset_token_expires', 'temporary_password'] },
      },
      scopes: {
        withPassword: {
          attributes: { exclude: [] },
        },
        publicProfile: {
          attributes: ['id', 'full_name', 'email', 'role'],
        },
      },
    }
  );

  return User;
};