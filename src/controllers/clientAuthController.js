const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sqlite, syncGet, syncAll, syncRun, generateClientId } = require('../db/index');
const { sendVerificationEmail } = require('../utils/email');
const { formatDate, formatDateTime, formatRupiah } = require('../utils/helpers');

const renderRegister = (req, res) => {
  res.render('client/register', { title: 'Daftar Akun', error: null, old: {} });
};

const handleRegister = async (req, res) => {
  const { name, email, password, password2 } = req.body;

  const errors = {};
  if (!name || name.trim().length < 2) errors.name = 'Nama minimal 2 karakter';
  if (!email || !email.includes('@')) errors.email = 'Email tidak valid';
  if (!password || password.length < 6) errors.password = 'Password minimal 6 karakter';
  if (password !== password2) errors.password2 = 'Konfirmasi password tidak cocok';

  if (Object.keys(errors).length > 0) {
    return res.render('client/register', { title: 'Daftar Akun', error: errors, old: { name, email } });
  }

  const existingEmail = syncGet('SELECT id FROM clients WHERE email = ?', [email.toLowerCase()]);
  if (existingEmail) {
    return res.render('client/register', {
      title: 'Daftar Akun',
      error: { email: 'Email sudah terdaftar' },
      old: { name, email },
    });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const client_id = generateClientId();
  const result = syncRun(
    'INSERT INTO clients (client_id, name, email, password_hash, verified) VALUES (?, ?, ?, ?, 0)',
    [client_id, name.trim(), email.toLowerCase(), password_hash]
  );

  const clientDbId = result.lastInsertRowid;

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  syncRun(
    'INSERT INTO client_verifications (client_id, token, expires_at) VALUES (?, ?, ?)',
    [clientDbId, token, expiresAt]
  );

  try {
    await sendVerificationEmail(email, name, token);
  } catch (err) {
    console.error('Email send error:', err.message);
  }

  res.render('client/verify-sent', { title: 'Verifikasi Email', email });
};

const handleVerify = (req, res) => {
  const { token } = req.params;

  const verification = syncGet(
    'SELECT * FROM client_verifications WHERE token = ? AND used = 0',
    [token]
  );

  if (!verification) {
    return res.render('client/verify-email', { title: 'Verifikasi Gagal', success: false, message: 'Token tidak valid atau sudah digunakan.' });
  }

  if (new Date(verification.expires_at) < new Date()) {
    return res.render('client/verify-email', { title: 'Verifikasi Gagal', success: false, message: 'Link verifikasi sudah kadaluarsa.' });
  }

  syncRun('UPDATE clients SET verified = 1 WHERE id = ?', [verification.client_id]);
  syncRun('UPDATE client_verifications SET used = 1 WHERE id = ?', [verification.id]);

  res.render('client/verify-email', { title: 'Verifikasi Berhasil', success: true, message: 'Email berhasil diverifikasi! Silakan masuk.' });
};

const renderLogin = (req, res) => {
  res.render('client/login', { title: 'Masuk', error: null, redirect: req.query.redirect || null });
};

const handleLogin = async (req, res) => {
  const { email, password } = req.body;

  const client = syncGet('SELECT * FROM clients WHERE email = ?', [email.toLowerCase()]);

  if (!client) {
    return res.render('client/login', { title: 'Masuk', error: 'Email atau password salah', redirect: req.query.redirect || null });
  }

  const valid = await bcrypt.compare(password, client.password_hash);
  if (!valid) {
    return res.render('client/login', { title: 'Masuk', error: 'Email atau password salah', redirect: req.query.redirect || null });
  }

  if (!client.verified) {
    return res.render('client/login', {
      title: 'Masuk',
      error: 'Akun belum diverifikasi. Silakan cek email untuk link verifikasi.',
      redirect: req.query.redirect || null,
    });
  }

  req.session.isClient = true;
  req.session.clientId = client.id;
  req.session.clientUuid = client.client_id;
  req.session.clientName = client.name;
  req.session.clientEmail = client.email;
  req.session.clientPhone = client.phone || '';

  const redirect = req.query.redirect || '/akun';
  res.redirect(redirect);
};

const handleLogout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};

const renderAccount = (req, res) => {
  const client = syncGet('SELECT id, client_id, name, email, phone, address, province, city, postal_code, created_at FROM clients WHERE id = ?', [req.session.clientId]);
  if (!client) return res.redirect('/masuk');

  const conversation = syncGet('SELECT * FROM chat_conversations WHERE client_id = ? ORDER BY updated_at DESC LIMIT 1', [client.id]);

  res.render('client/account', {
    title: 'Akun Saya',
    client,
    conversation,
    success: req.query.success || null,
    error: req.query.error || null,
  });
};

const handleAccountUpdate = (req, res) => {
  const { name, phone, address, province, city, postal_code } = req.body;

  const errors = {};
  if (!name || name.trim().length < 2) errors.name = 'Nama minimal 2 karakter';
  if (phone && !/^[\d\s\-+()]{6,20}$/.test(phone.trim())) errors.phone = 'Nomor HP tidak valid';
  if (postal_code && !/^[\d]{4,10}$/.test(postal_code.trim())) errors.postal_code = 'Kode pos tidak valid';

  if (Object.keys(errors).length > 0) {
    return res.render('client/account', {
      title: 'Akun Saya',
      client: { ...req.body, id: req.session.clientId, client_id: req.session.clientUuid, created_at: new Date() },
      conversation: null,
      success: null,
      error: errors,
    });
  }

  try {
    syncRun(`
      UPDATE clients SET
        name = ?,
        phone = ?,
        address = ?,
        province = ?,
        city = ?,
        postal_code = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `, [
      name.trim(),
      phone ? phone.trim() : null,
      address ? address.trim() : null,
      province ? province.trim() : null,
      city ? city.trim() : null,
      postal_code ? postal_code.trim() : null,
      req.session.clientId
    ]);

    // Refresh session
    req.session.clientName = name.trim();
    req.session.clientPhone = phone ? phone.trim() : '';

    res.redirect('/akun?success=Profil berhasil diperbarui');
  } catch (err) {
    console.error('Account update error:', err);
    res.render('client/account', {
      title: 'Akun Saya',
      client: { ...req.body, id: req.session.clientId, client_id: req.session.clientUuid, created_at: new Date() },
      conversation: null,
      success: null,
      error: { _form: 'Gagal menyimpan perubahan. Silakan coba lagi.' },
    });
  }
};

const renderChat = (req, res) => {
  const client = syncGet('SELECT id, client_id, name, email FROM clients WHERE id = ?', [req.session.clientId]);
  if (!client) return res.redirect('/masuk');

  const conversation = syncGet('SELECT * FROM chat_conversations WHERE client_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1', [client.id, 'open']);

  res.render('client/chat', { title: 'Chat dengan Admin', client });
};

// GET /akun/pesanan — Order history
const renderOrderHistory = (req, res) => {
  const client = syncGet('SELECT * FROM clients WHERE id = ?', [req.session.clientId]);
  if (!client) return res.redirect('/masuk');

  const { tab } = req.query;
  const activeTab = tab || 'semua';

  const orders = syncAll(`
    SELECT * FROM orders
    WHERE client_id = ? OR email = ?
    ORDER BY created_at DESC
  `, [client.id, client.email]);

  res.render('client/order-history', {
    title: 'Riwayat Pesanan',
    client,
    orders,
    activeTab,
    formatDate,
  });
};

// GET /akun/pesanan/:id — Order detail
const renderOrderDetail = (req, res) => {
  const client = syncGet('SELECT * FROM clients WHERE id = ?', [req.session.clientId]);
  if (!client) return res.redirect('/masuk');

  const order = syncGet(`
    SELECT * FROM orders
    WHERE id = ? AND (client_id = ? OR email = ?)
  `, [req.params.id, client.id, client.email]);

  if (!order) return res.redirect('/akun/pesanan');

  const docImages = syncAll(`
    SELECT * FROM order_images WHERE order_id = ? AND image_type = 'documentation' ORDER BY uploaded_at DESC
  `, [req.params.id]);

  res.render('client/order-detail', {
    title: `Pesanan ${order.order_id}`,
    client,
    order,
    docImages,
    formatDate,
    formatDateTime,
    formatRupiah,
  });
};

module.exports = { renderRegister, handleRegister, handleVerify, renderLogin, handleLogin, handleLogout, renderAccount, handleAccountUpdate, renderChat, renderOrderHistory, renderOrderDetail };
