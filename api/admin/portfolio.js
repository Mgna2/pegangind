const { requireAdminAuth } = require('../../auth');
const { all: dbAll, run: dbRun } = require('../db');

// GET /api/admin/portfolio
async function handleGet(req, res) {
  const auth = requireAdminAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const items = await dbAll('SELECT * FROM portfolio ORDER BY created_at DESC');
  return res.json({ success: true, items });
}

// POST /api/admin/portfolio — add portfolio item
async function handlePost(req, res) {
  const auth = requireAdminAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const { title, description, category, image_path, visible } = req.body || {};
  await dbRun(
    `INSERT INTO portfolio (title, description, category, image_path, visible) VALUES (?, ?, ?, ?, ?)`,
    [title || '', description || '', category || '', image_path || '', visible === '1' || visible === true ? 1 : 0]
  );
  return res.json({ success: true, redirect: '/admin/portofolio' });
}

module.exports = (req, res) => {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
};
