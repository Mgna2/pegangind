const { requireAdminAuth } = require('../../../auth');
const { get: dbGet, run: dbRun } = require('../../db');

async function handleGet(req, res, id) {
  const auth = requireAdminAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const order = await dbGet('SELECT * FROM orders WHERE id = ?', [id]);
  if (!order) return res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' });

  return res.json({ success: true, order });
}

async function handlePut(req, res, id) {
  const auth = requireAdminAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const body = req.body;
    const fields = [];
    const params = {};

    const allowedFields = [
      'client_name', 'whatsapp', 'resi_shopee', 'shopee_link', 'material',
      'filament_color', 'status', 'notes', 'tracking_number', 'address',
      'province', 'city', 'postal_code', 'completed_at', 'shipped_at',
    ];

    for (const f of allowedFields) {
      if (body[f] !== undefined) {
        fields.push(`${f} = @${f}`);
        params[f] = body[f];
      }
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.id = id;

    if (fields.length > 1) {
      await dbRun(`UPDATE orders SET ${fields.join(', ')} WHERE id = @id`, params);

      // Log status change
      if (body.status) {
        const old = await dbGet('SELECT status FROM orders WHERE id = ?', [id]);
        if (old && old.status !== body.status) {
          await dbRun(
            `INSERT INTO order_logs (order_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)`,
            [id, old.status, body.status, auth.username]
          );
        }
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function handleDelete(req, res, id) {
  const auth = requireAdminAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  await dbRun('DELETE FROM orders WHERE id = ?', [id]);
  return res.json({ success: true, redirect: '/admin/pesanan' });
}

module.exports = (req, res) => {
  const id = req.query.id || req.url.split('/')[3];
  if (req.method === 'GET') return handleGet(req, res, id);
  if (req.method === 'PUT') return handlePut(req, res, id);
  if (req.method === 'POST') return handleDelete(req, res, id);
  return res.status(405).json({ error: 'Method not allowed' });
};
