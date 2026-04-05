const { clearAuthCookie } = require('../auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  clearAuthCookie(res);
  return res.json({ success: true, redirect: '/admin' });
};
