/**
 * models/ChangeRequest.js
 *
 * Model untuk menyimpan permintaan perubahan role dan/atau unit kerja dari pengguna.
 * Mendukung perubahan role (admin, management, viewer) dan/atau unit kerja dalam satu request.
 *
 * ============================================================
 * RELASI
 * ============================================================
 * - ChangeRequest.belongsTo(User) as 'user'
 * - ChangeRequest.belongsTo(Unit) as 'currentUnit'
 * - ChangeRequest.belongsTo(Unit) as 'requestedUnit'
 *
 * ============================================================
 * ALUR BISNIS
 * ============================================================
 * 1. User (non-admin) mengajukan perubahan melalui POST /api/auth/change-request
 * 2. Entri dibuat dengan status 'pending'
 * 3. Admin melihat daftar permintaan di panel admin
 * 4. Admin approve/reject → status berubah, dan jika approve, role/unit user diupdate
 *
 * ============================================================
 * KEAMANAN & VALIDASI
 * ============================================================
 * - Satu user hanya boleh memiliki satu permintaan pending pada satu waktu
 *   (dicegah di controller, bukan di model)
 * - requested_role hanya diizinkan salah satu dari ['admin','management','viewer']
 * - requested_unit_id harus merujuk ke unit yang valid (validasi di controller)
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * - Jika ada role baru di sistem, tambahkan ke ENUM `requested_role`
 *   dan sinkronkan dengan validasi controller.
 * - Jangan lupa menjalankan migrasi untuk mengubah ENUM jika role bertambah.
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChangeRequest extends Model {
    /**
     * Mendefinisikan asosiasi dengan model lain.
     * @param {Object} models - Semua model yang terdaftar di Sequelize
     */
    static associate(models) {
      // User yang mengajukan permintaan
      ChangeRequest.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });

      // Unit kerja saat ini (current) - bisa null jika user tidak memiliki unit
      ChangeRequest.belongsTo(models.Unit, {
        foreignKey: 'current_unit_id',
        as: 'currentUnit',
      });

      // Unit kerja yang diminta (requested) - bisa null jika hanya perubahan role
      ChangeRequest.belongsTo(models.Unit, {
        foreignKey: 'requested_unit_id',
        as: 'requestedUnit',
      });
    }
  }

  ChangeRequest.init(
    {
      /**
       * id - Primary key menggunakan UUID untuk keamanan dan menghindari enumerasi.
       */
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },

      /**
       * user_id - Foreign key ke users.id.
       * User yang mengajukan permintaan.
       */
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE', // Jika user dihapus, hapus juga permintaannya
        onUpdate: 'CASCADE',
      },

      /**
       * current_unit_id - Unit kerja user saat ini (sebelum perubahan).
       * Bisa null jika user tidak memiliki unit (misalnya admin).
       */
      current_unit_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'units',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },

      /**
       * requested_unit_id - Unit kerja yang diminta (tujuan).
       * Bisa null jika hanya meminta perubahan role.
       */
      requested_unit_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'units',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },

      /**
       * requested_role - Role yang diminta.
       * Null jika hanya meminta perubahan unit.
       * ENUM harus sinkron dengan nilai role di sistem.
       */
      requested_role: {
        type: DataTypes.ENUM('admin', 'management', 'viewer'),
        allowNull: true,
      },

      /**
       * status - Status pemrosesan permintaan.
       * 'pending'  : menunggu review admin
       * 'approved' : disetujui dan sudah diterapkan
       * 'rejected' : ditolak
       */
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false,
      },

      /**
       * admin_notes - Catatan opsional dari admin saat approve/reject.
       * Berguna untuk dokumentasi alasan penolakan atau perubahan.
       */
      admin_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ChangeRequest',
      tableName: 'change_requests',
      underscored: true,          // Menggunakan snake_case untuk kolom
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return ChangeRequest;
};