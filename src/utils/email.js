const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendVerificationEmail = async (to, name, token) => {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
  const verifyUrl = `${baseUrl}/verify/${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <div style="background: #124875; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">PeganganID</h2>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #ddd;">
        <h3 style="color: #124875; margin-top: 0;">Halo, ${name}!</h3>
        <p>Terima kasih telah mendaftar di <strong>PeganganID</strong>.</p>
        <p>Klik tombol di bawah ini untuk mengaktifkan akun kamu:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background: #124875; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verifikasi Email</a>
        </div>
        <p style="color: #666; font-size: 14px;">Atau salin link ini ke browser:<br><a href="${verifyUrl}" style="color: #124875;">${verifyUrl}</a></p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">Link ini berlaku selama 24 jam. Jika kamu tidak merasa mendaftar, abaikan email ini.</p>
      </div>
    </div>
  `;

  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'Verifikasi Email - PeganganID',
    html,
  });
};

module.exports = { sendVerificationEmail };
