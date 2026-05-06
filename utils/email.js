/**
 * utils/email.js
 *
 =============================================================================
 * PENGIRIMAN EMAIL UNTUK SAKTI
 =============================================================================
 * Modul ini menyediakan fungsi untuk mengirim email notifikasi:
 *   - Reset password (link via JWT)
 *   - Password sementara untuk akun baru
 *
 * Transporter Nodemailer dibuat secara lazy (saat fungsi dipanggil) untuk
 * memvalidasi environment variables terlebih dahulu. Ini memberikan error
 * message yang jelas jika SMTP_HOST, SMTP_USER, atau SMTP_PASS tidak lengkap.
 *
 * [BUG #23] Sebelumnya transporter dibuat di level module → error cryptic
 *           saat env vars tidak ada. Sekarang validasi dilakukan di dalam fungsi.
 *
 =============================================================================
 * CATATAN KEAMANAN & ARSITEKTUR
 =============================================================================
 * - Reset link DIVAS oleh server (JWT), bukan dari input user.
 * - Email dikirim synchronous dalam request cycle. Untuk production dengan
 *   volume tinggi, pertimbangkan message queue (BullMQ, RabbitMQ).
 * - SMTP credentials wajib ada di environment variables; jika tidak,
 *   fungsi akan throw error dengan pesan yang jelas.
 *
 =============================================================================
 * ENVIRONMENT VARIABLES YANG DIPERLUKAN
 =============================================================================
 *   SMTP_HOST     - Server SMTP (misal: smtp.gmail.com)
 *   SMTP_PORT     - Port (587 atau 465)
 *   SMTP_USER     - Username/email untuk autentikasi
 *   SMTP_PASS     - Password atau app password
 *   SMTP_FROM     - (opsional) Pengirim, jika tidak diisi akan pakai SMTP_USER
 *   FRONTEND_URL  - (opsional) Base URL frontend, untuk link login
 */

// ============================================================================
// Dependencies
// ============================================================================
const nodemailer = require('nodemailer');

// ============================================================================
// Helper: Membuat Transporter Nodemailer (Lazy)
// ============================================================================

/**
 * Membuat transporter Nodemailer dengan validasi environment variables terlebih dahulu.
 * Transporter tidak disimpan sebagai singleton untuk memastikan konfigurasi selalu
 * dibaca ulang dan divalidasi. Untuk beban tinggi, bisa di-cache di level aplikasi.
 *
 * @returns {nodemailer.Transporter} Transporter yang sudah dikonfigurasi
 * @throws {Error} Jika SMTP_HOST, SMTP_USER, atau SMTP_PASS tidak lengkap
 */
function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  // Validasi semua env var yang diperlukan ada
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'Konfigurasi SMTP tidak lengkap. ' +
      'Pastikan SMTP_HOST, SMTP_USER, dan SMTP_PASS tersedia di environment variables.'
    );
  }

  const port = parseInt(SMTP_PORT, 10) || 587;        // default STARTTLS
  const secure = port === 465;                       // true hanya untuk port SSL

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    // Timeout agar request tidak menggantung selamanya
    connectionTimeout: 10000,  // 10 detik
    greetingTimeout:   5000,   // 5 detik
    socketTimeout:     10000,  // 10 detik
  });
}

// ============================================================================
// Email: Reset Password (Link)
// ============================================================================

/**
 * Mengirim email reset password ke pengguna.
 * Email berisi link (JWT) yang berlaku 1 jam.
 *
 * @param {string} to       - Alamat email penerima
 * @param {string} resetLink - URL lengkap untuk reset password (termasuk token)
 * @returns {Promise<nodemailer.SentMessageInfo>} Info pengiriman
 * @throws {Error} Jika parameter tidak valid atau pengiriman gagal
 */
async function sendResetPasswordEmail(to, resetLink) {
  if (!to || !resetLink) {
    throw new Error('Email tujuan dan reset link wajib diisi');
  }

  const transporter = createTransporter();
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  const mailOptions = {
    from: `"SAKTI Support" <${fromAddress}>`,
    to,
    subject: 'Reset Password Akun SAKTI',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Permintaan Reset Password</h2>
        <p>Kami menerima permintaan untuk mereset password akun SAKTI Anda.</p>
        <p>Klik tombol di bawah ini untuk melanjutkan. <strong>Link berlaku selama 1 jam.</strong></p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}"
             style="background-color: #007bff; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Atau salin URL ini ke browser Anda:<br>
          <span style="color: #007bff;">${resetLink}</span>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          Jika Anda tidak meminta reset password, abaikan email ini.
          Password Anda tidak akan berubah.
        </p>
      </div>
    `,
    text: `
Reset Password Akun SAKTI

Klik link berikut untuk mereset password Anda (berlaku 1 jam):
${resetLink}

Jika Anda tidak meminta reset password, abaikan email ini.
    `.trim(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[email] Reset password email sent to ${to}. MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[email] Gagal mengirim email ke ${to}:`, error.message);
    throw new Error('Gagal mengirim email. Silakan coba lagi nanti.');
  }
}

// ============================================================================
// Email: Temporary Password (Akun Baru oleh Admin)
// ============================================================================

/**
 * Mengirim email berisi password sementara ke pengguna yang baru dibuat oleh admin.
 * Admin dapat juga menyampaikan password melalui saluran lain (chat/telepon).
 *
 * @param {string} to               - Alamat email penerima
 * @param {string} fullName         - Nama lengkap pengguna (untuk sapaan)
 * @param {string} temporaryPassword - Password sementara (plain text)
 * @returns {Promise<nodemailer.SentMessageInfo>} Info pengiriman
 * @throws {Error} Jika parameter tidak valid atau pengiriman gagal
 */
async function sendTemporaryPasswordEmail(to, fullName, temporaryPassword) {
  if (!to || !fullName || !temporaryPassword) {
    throw new Error('Email, nama, dan password sementara wajib diisi');
  }

  const transporter = createTransporter();
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  const loginUrl = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/login`
    : 'Hubungi admin untuk URL login';

  const mailOptions = {
    from: `"SAKTI Support" <${fromAddress}>`,
    to,
    subject: 'Akun SAKTI Anda Telah Dibuat',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Selamat Datang di SAKTI</h2>
        <p>Halo <strong>${fullName}</strong>,</p>
        <p>Akun SAKTI Anda telah dibuat oleh admin. Gunakan informasi di bawah untuk login:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 4px; margin: 20px 0;">
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>Password Sementara:</strong> <code>${temporaryPassword}</code></p>
        </div>
        <p style="color: #e74c3c;">
          <strong>Penting:</strong> Segera ganti password sementara ini setelah login pertama
          melalui menu Profil → Ganti Password.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${loginUrl}"
             style="background-color: #007bff; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Login Sekarang
          </a>
        </div>
      </div>
    `,
    text: `
Selamat Datang di SAKTI

Akun Anda telah dibuat. Detail login:
Email: ${to}
Password Sementara: ${temporaryPassword}

PENTING: Segera ganti password ini setelah login pertama.
    `.trim(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[email] Temporary password email sent to ${to}. MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[email] Gagal mengirim email ke ${to}:`, error.message);
    throw new Error('Gagal mengirim email notifikasi akun baru.');
  }
}

// ============================================================================
// Ekspor Fungsi Publik
// ============================================================================
module.exports = {
  sendResetPasswordEmail,
  sendTemporaryPasswordEmail,
};