/**
 * models/passwordResetRequest.js
 *
 * Model untuk menyimpan permintaan reset password dari pengguna.
 * Digunakan dalam admin-driven reset password flow (bukan self-service token).
 *
 * ============================================================
 * RELASI
 * ============================================================
 * - PasswordResetRequest.belongsTo(User) as 'user' (pemohon)
 * - PasswordResetRequest.belongsTo(User) as 'processor' (admin yang memproses)
 *
 * ============================================================
 * ALUR BISNIS (Admin-Driven)
 * ============================================================
 * 1. User lupa password → POST /api/auth/forgot-password dengan email
 * 2. Backend membuat entri PasswordResetRequest dengan is_processed = false
 * 3. Admin melihat daftar permintaan di GET /api/admin/password-reset-requests
 * 4. Admin memproses (mereset password) → POST /api/admin/password-reset-requests/:id/reset
 * 5. Setelah reset:
 *    - is_processed diupdate menjadi true
 *    - processed_by diisi dengan ID admin
 *    - processed_at diisi dengan waktu sekarang
 *
 * ============================================================
 * KEAMANAN & VALIDASI
 * ============================================================
 * - Tidak ada validasi email di sini (dicek di controller)
 * - is_processed default false, hanya admin yang bisa menandai processed
 * - Satu user bisa memiliki banyak permintaan, namun hanya yang is_processed=false
 *   yang ditampilkan ke admin (per user paling tua)
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Tabel ini hanya memiliki created_at (timestamps menggunakan createdAt)
 * - updatedAt dimatikan karena tidak ada kolom updated_at di tabel
 * - Jalankan job pembersihan berkala untuk menghapus permintaan lama yang sudah
 *   diproses (is_processed=true) untuk menjaga ukuran tabel tetap kecil.
 * - Jika ingin menambah field (misal: expiry time), buat migration baru.
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PasswordResetRequest extends Model {
    /**
     * Mendefinisikan asosiasi dengan model lain.
     * @param {Object} models - Semua model yang terdaftar
     */
    static associate(models) {
      // User yang mengajukan permintaan reset
      PasswordResetRequest.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      // Admin yang memproses permintaan (nullable sebelum diproses)
      PasswordResetRequest.belongsTo(models.User, { foreignKey: 'processed_by', as: 'processor' });
    }
  }

  PasswordResetRequest.init(
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
       * user_id - Foreign key ke users.id (pemohon reset password).
       */
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE', // Jika user dihapus, hapus permintaan resetnya
        onUpdate: 'CASCADE',
      },
      /**
       * is_processed - Status pemrosesan permintaan.
       * false = menunggu admin, true = sudah diproses.
       */
      is_processed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      /**
       * processed_by - ID admin yang memproses (nullable jika belum diproses).
       */
      processed_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      /**
       * processed_at - Waktu ketika permintaan diproses oleh admin.
       */
      processed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'PasswordResetRequest',
      tableName: 'password_reset_requests',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false, // tabel tidak memiliki kolom updated_at
    }
  );

  return PasswordResetRequest;
};