const { requireAdminAuth } = require('../../../auth');
const { run: dbRun } = require('../../db');

async function handlePut(req, res, id) {
  const auth = requireAdminAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const { title, description, category, image_path, visible } = req.body || {};
  const fields = [];
  const params = {};

  if (title !== undefined)       { fields.push('title = @title');       params.title = title; }
  if (description !== undefined) { fields.push('description = @description'); params.description = description; }
  if (category !== undefined)    { fields.push('category = @category');    params.category = category; }
  if (image_path !== undefined)  { fields.push('image_path = @image_path'); params.image_path = image_path; }
  if (visible !== undefined)     { fields.push('visible = @visible');     params.visible = visible === '1' || visible === true ? 1 : 0; }

  params.id = id;

  if (fields.length > 0) {
    await dbRun(`UPDATE portfolio SET ${fields.join(', ')} WHERE id = @id`, params);
  }

  return res.json({ success: true });
}

async function handleDelete(req, res, id) {
  const auth = requireAdminAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  await dbRun('DELETE FROM portfolio WHERE id = ?', [id]);
  return res.json({ success: true, redirect: '/admin/portofolio' });
}

module.exports = (req, res) => {
  const id = req.query.id || req.url.split('/')[3];
  if (req.method === 'PUT') return handlePut(req, res, id);
  if (req.method === 'POST') return handleDelete(req, res, id);
  return res.status(405).json({ error: 'Method not allowed' });
};
