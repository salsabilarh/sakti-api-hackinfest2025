// services/emailService.js
const nodemailer = require('nodemailer');
const config = require('../config/config');

const transporter = nodemailer.createTransport({
  service: config.email.service,
  auth: {
    user: config.email.auth.user,
    pass: config.email.auth.pass
  }
});

exports.sendResetPasswordEmail = async (email, newPassword) => {
  const mailOptions = {
    from: config.email.auth.user,
    to: email,
    subject: 'Password Reset',
    text: `Your password has been reset. Your new password is: ${newPassword}\n\nPlease change it after logging in.`,
    html: `<p>Your password has been reset. Your new password is: <strong>${newPassword}</strong></p><p>Please change it after logging in.</p>`
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reset password email sent to ${email}`);
  } catch (error) {
    console.error('Error sending reset password email:', error);
    throw error;
  }
};