'use strict';

/**
 * Migration: create-refresh-tokens
 *
 * Membuat tabel `refresh_tokens` untuk mendukung sistem dual-token authentication.
 * Memisahkan access token (umur pendek, 15 menit) dan refresh token (umur panjang, 7 hari).
 *
 * ============================================================
 * ALUR DUAL-TOKEN
 * ============================================================
 *
 * 1. Login sukses:
 *    - Server generate raw refresh token (random hex 40 bytes -> 80 karakter)
 *    - Hash raw token dengan SHA-256, simpan `token_hash` di tabel ini
 *    - Simpan `user_id`, `expires_at` (created_at + 7 hari), `is_revoked = false`
 *    - Kirim raw token ke client bersama access token (JWT pendek)
 *
 * 2. Client menyimpan raw refresh token (httpOnly cookie atau secure storage)
 *
 * 3. Saat access token habis masa berlaku (15 menit):
 *    - Client kirim raw refresh token ke `POST /api/auth/refresh`
 *    - Server hash raw token -> cari di tabel berdasarkan `token_hash`
 *    - Validasi: `is_revoked = false` dan `expires_at > NOW()`
 *    - Jika valid, generate access token baru dan kirim ke client
 *    - Token hash di DB tidak berubah (refresh token tetap valid hingga expired/revoked)
 *
 * 4. Logout (satu perangkat):
 *    - Server menerima raw refresh token
 *    - Hash dan cari token -> set `is_revoked = true`
 *    - Token tidak dapat digunakan lagi untuk refresh
 *
 * 5. Logout dari semua perangkat:
 *    - Update semua `is_revoked = true` untuk `user_id` tersebut
 *
 * 6. Ganti password atau admin nonaktifkan akun:
 *    - Revoke semua refresh token milik user
 *
 * 7. Pembersihan berkala (cron job):
 *    - Hapus baris dengan `expires_at < NOW()` dan `is_revoked = true`
 *
 * ============================================================
 * KEAMANAN
 * ============================================================
 * - Raw token tidak pernah disimpan di database (hanya hash-nya)
 * - Jika database bocor, attacker tidak bisa langsung menggunakan hash
 * - Access token berumur pendek membatasi window penyalahgunaan
 * - Revoke token memberikan kontrol penuh ke admin/user
 *
 * ============================================================
 * MAINTENANCE
 * ============================================================
 * - Jalankan job pembersihan harian:
 *   DELETE FROM refresh_tokens WHERE expires_at < NOW() AND is_revoked = true;
 * - Index `idx_refresh_tokens_cleanup` diperuntukkan untuk query tersebut
 * - Tabel dapat membesar jika tidak dibersihkan → pantau ukuran tabel
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_tokens', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        comment: 'Primary key UUID, tidak dapat di-enumerate',
      },

      token_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
        comment: 'SHA-256 hash dari raw refresh token. Raw token dikirim ke client, hash disimpan di DB.',
      },

      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Foreign key ke users.id. Jika user dihapus, semua token ikut terhapus.',
      },

      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Timestamp kapan token tidak lagi valid meskipun belum direvoke. Default: created_at + 7 hari.',
      },

      is_revoked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Status revokasi. true = token sudah tidak bisa dipakai (logout, ganti password, revoke admin).',
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        comment: 'Waktu token dibuat (digunakan untuk menghitung expires_at).',
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        comment: 'Waktu terakhir token diupdate (biasanya saat revoke).',
      },
    });

    // Index untuk pencarian token_hash (digunakan di setiap refresh request)
    await queryInterface.addIndex('refresh_tokens', ['token_hash'], {
      name: 'idx_refresh_tokens_hash',
      comment: 'Mempercepat pencarian token_hash saat validasi refresh token.',
    });

    // Index untuk revoke semua token milik user (logout-all, ganti password, admin nonaktifkan)
    await queryInterface.addIndex('refresh_tokens', ['user_id'], {
      name: 'idx_refresh_tokens_user_id',
      comment: 'Mempercepat update is_revoked untuk semua token milik user tertentu.',
    });

    // Composite index untuk cleanup job (expired + revoked)
    await queryInterface.addIndex('refresh_tokens', ['expires_at', 'is_revoked'], {
      name: 'idx_refresh_tokens_cleanup',
      comment: 'Mempercepat query pembersihan token yang sudah expired dan direvoke.',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens');
  },
};