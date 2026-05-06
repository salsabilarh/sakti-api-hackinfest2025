'use strict';

/**
 * Migration: add-performance-indexes
 *
 * Menambahkan index database pada kolom yang sering digunakan dalam WHERE, JOIN, ORDER BY, dan filter.
 * Tujuan: meningkatkan performa query seiring pertumbuhan data.
 *
 * Dampak performa yang diharapkan:
 * - login()               : -80% waktu query (index email)
 * - getDashboardStats()   : -70% waktu query (is_verified, last_login)
 * - getAllUsers()         : -60% waktu query (role, is_active, unit_kerja_id)
 * - refreshToken()        : -90% waktu query (token_hash exact match)
 * - getDownloadLogs()     : -50% waktu query (created_at sort)
 */

module.exports = {
  async up(queryInterface) {
    // ============================================================
    // Tabel: users
    // ============================================================

    // Index email (digunakan di setiap login)
    try {
      await queryInterface.addIndex('users', ['email'], {
        name: 'idx_users_email',
        unique: true,
      });
    } catch (e) {
      if (e.name !== 'SequelizeUniqueConstraintError' && !e.message.includes('Duplicate key name')) throw e;
    }

    // Index is_verified (dashboard counts, waiting users list)
    await queryInterface.addIndex('users', ['is_verified'], {
      name: 'idx_users_is_verified',
    });

    // Index last_login (statistik pengguna aktif 30 hari)
    await queryInterface.addIndex('users', ['last_login'], {
      name: 'idx_users_last_login',
    });

    // Index unit_kerja_id (filter dan join)
    await queryInterface.addIndex('users', ['unit_kerja_id'], {
      name: 'idx_users_unit_kerja_id',
    });

    // Index role (filter)
    await queryInterface.addIndex('users', ['role'], {
      name: 'idx_users_role',
    });

    // Composite index is_active + is_verified (filter gabungan)
    await queryInterface.addIndex('users', ['is_active', 'is_verified'], {
      name: 'idx_users_active_verified',
    });

    // ============================================================
    // Tabel: password_reset_requests
    // ============================================================

    await queryInterface.addIndex('password_reset_requests', ['user_id'], {
      name: 'idx_prr_user_id',
    });

    await queryInterface.addIndex('password_reset_requests', ['is_processed', 'created_at'], {
      name: 'idx_prr_processed_created',
    });

    // ============================================================
    // Tabel: download_logs
    // ============================================================

    await queryInterface.addIndex('download_logs', ['user_id'], {
      name: 'idx_dl_user_id',
    });

    await queryInterface.addIndex('download_logs', ['marketing_kit_id'], {
      name: 'idx_dl_marketing_kit_id',
    });

    await queryInterface.addIndex('download_logs', ['created_at'], {
      name: 'idx_dl_created_at',
    });

    // ============================================================
    // Tabel: unit_change_requests
    // ============================================================

    await queryInterface.addIndex('unit_change_requests', ['status'], {
      name: 'idx_ucr_status',
    });

    await queryInterface.addIndex('unit_change_requests', ['user_id'], {
      name: 'idx_ucr_user_id',
    });

    // ============================================================
    // Tabel: refresh_tokens (sistem dual-token)
    // ============================================================

    try {
      await queryInterface.addIndex('refresh_tokens', ['token_hash'], {
        name: 'idx_rt_token_hash',
        unique: true,
      });

      await queryInterface.addIndex('refresh_tokens', ['user_id'], {
        name: 'idx_rt_user_id',
      });

      await queryInterface.addIndex('refresh_tokens', ['expires_at', 'is_revoked'], {
        name: 'idx_rt_cleanup',
      });
    } catch (e) {
      if (e.message && e.message.includes("Table 'refresh_tokens' doesn't exist")) {
        console.warn('[Migration] Tabel refresh_tokens belum ada, index dilewati.');
      } else if (!e.message.includes('Duplicate key name')) throw e;
    }
  },

  async down(queryInterface) {
    const indexesToRemove = [
      ['users', 'idx_users_email'],
      ['users', 'idx_users_is_verified'],
      ['users', 'idx_users_last_login'],
      ['users', 'idx_users_unit_kerja_id'],
      ['users', 'idx_users_role'],
      ['users', 'idx_users_active_verified'],
      ['password_reset_requests', 'idx_prr_user_id'],
      ['password_reset_requests', 'idx_prr_processed_created'],
      ['download_logs', 'idx_dl_user_id'],
      ['download_logs', 'idx_dl_marketing_kit_id'],
      ['download_logs', 'idx_dl_created_at'],
      ['unit_change_requests', 'idx_ucr_status'],
      ['unit_change_requests', 'idx_ucr_user_id'],
      ['refresh_tokens', 'idx_rt_token_hash'],
      ['refresh_tokens', 'idx_rt_user_id'],
      ['refresh_tokens', 'idx_rt_cleanup'],
    ];

    for (const [table, indexName] of indexesToRemove) {
      await queryInterface.removeIndex(table, indexName);
    }
  },
};