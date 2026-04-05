const crypto = require('crypto');
const { requireAdminAuth } = require('../auth');
const { all: dbAll, get: dbGet, run: dbRun } = require('../db');

// GET /api/admin/orders — list orders
async function handleGet(req, res) {
  const auth = requireAdminAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const { status, search } = req.query || {};
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = [];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (search) {
    query += ' AND (client_name LIKE ? OR order_id LIKE ? OR whatsapp LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  query += ' ORDER BY created_at DESC';

  const orders = await dbAll(query, params);
  return res.json({ success: true, orders });
}

// POST /api/admin/orders — create order
async function handlePost(req, res) {
  const auth = requireAdminAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const body = req.body;
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const rand = crypto.randomInt(100, 999);
    const orderId = `PG-${dateStr}-${rand}`;

    const result = await dbRun(`
      INSERT INTO orders (order_id, client_name, whatsapp, resi_shopee, shopee_link, material, filament_color, status, notes, address, province, city, postal_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderId,
      body.client_name || '',
      body.whatsapp || '',
      body.resi_shopee || '',
      body.shopee_link || '',
      body.material || '',
      body.filament_color || '',
      body.status || 'Pesanan Masuk',
      body.notes || '',
      body.address || '',
      body.province || '',
      body.city || '',
      body.postal_code || '',
    ]);

    return res.json({ success: true, orderId: result.lastInsertRowid, redirect: '/admin/pesanan' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = (req, res) => {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
};
