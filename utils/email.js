// utils/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true untuk port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendResetPasswordEmail(to, resetLink) {
  const mailOptions = {
    from: `"SAKTI Support" <${process.env.SMTP_FROM}>`,
    to,
    subject: 'Reset Password Akun SAKTI',
    html: `
      <h3>Permintaan Reset Password</h3>
      <p>Klik link di bawah ini untuk mereset password Anda. Link berlaku 1 jam.</p>
      <a href="${resetLink}" target="_blank">${resetLink}</a>
      <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendResetPasswordEmail };