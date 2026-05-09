/**
 * models/refreshToken.js
 *
 * Model untuk menyimpan refresh token dalam sistem dual-token authentication (Fix N24).
 * Refresh token digunakan untuk mendapatkan access token baru setelah access token kedaluwarsa.
 *
 * ============================================================
 * ALUR DUAL-TOKEN
 * ============================================================
 * 1. Login berhasil → server generate raw token (crypto.randomBytes(40) → hex)
 * 2. Raw token di-hash dengan SHA-256 → disimpan di kolom `token_hash`
 * 3. Raw token dikirim ke client (SEKALI dalam response login)
 * 4. Client menyimpan raw token di httpOnly cookie atau secure storage
 * 5. Saat access token expired: client kirim raw token ke POST /api/auth/refresh
 * 6. Server hash raw token → cari di DB → validasi is_revoked=false & expires_at > NOW()
 * 7. Jika valid → kembalikan access token baru
 * 8. Logout: set is_revoked = true untuk token tersebut → tidak bisa dipakai lagi
 *
 * ============================================================
 * KEAMANAN
 * ============================================================
 * - Raw token tidak pernah disimpan di database (hanya hash-nya)
 * - Setiap perangkat/login menghasilkan token berbeda → support multiple devices
 * - Revoke per-device (satu token) atau all-device (semua token user)
 * - Token memiliki masa berlaku (expires_at) dan dapat direvoke
 *
 * ============================================================
 * MAINTENANCE
 * ============================================================
 * - Jalankan job pembersihan berkala (cron) untuk menghapus token yang sudah:
 *   `DELETE FROM refresh_tokens WHERE expires_at < NOW() OR is_revoked = true`
 * - Konfigurasi masa berlaku melalui environment variable:
 *   `REFRESH_TOKEN_EXPIRES_DAYS` (default 7 hari)
 *
 * ============================================================
 * RELASI
 * ============================================================
 * - RefreshToken.belongsTo(User) as 'user'
 * - User.hasMany(RefreshToken) as 'refresh_tokens' (didefinisikan di models/user.js)
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RefreshToken extends Model {
    static associate(models) {
      RefreshToken.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  RefreshToken.init(
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
       * token_hash - SHA-256 hash dari raw refresh token.
       * Raw token dikirim ke client, hash disimpan di DB.
       * Validasi: `hash(client_token) === token_hash`
       * Panjang: 64 karakter hex (hasil SHA-256).
       */
      token_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      /**
       * user_id - Foreign key ke users.id.
       * Diperlukan untuk revoke semua token user saat logout-all atau ganti password.
       */
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      /**
       * expires_at - Batas waktu token masih dianggap valid.
       * Default diisi di controller: `created_at + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000`
       * Token yang sudah expired tidak dapat digunakan meskipun is_revoked = false.
       */
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      /**
       * is_revoked - Status revokasi token.
       * false: token aktif (masih dalam masa berlaku)
       * true:  token sudah di-revoke (logout, ganti password, admin revoke)
       */
      is_revoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'RefreshToken',
      tableName: 'refresh_tokens',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return RefreshToken;
};