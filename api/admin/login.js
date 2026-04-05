const bcrypt = require('bcrypt');
const { get } = require('../db');
const { setAuthCookie } = require('../auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body || {};
  const user = await get('SELECT * FROM users WHERE username = ?', [username]);

  if (!user) {
    return res.status(401).json({ success: false, error: 'Username atau password salah' });
  }

  let valid = false;
  try {
    valid = await bcrypt.compare(password, user.password_hash);
  } catch {
    valid = false;
  }

  if (!valid) {
    return res.status(401).json({ success: false, error: 'Username atau password salah' });
  }

  setAuthCookie(res, { userId: user.id, username: user.username, role: user.role });

  return res.json({ success: true, redirect: '/admin/dashboard' });
};
