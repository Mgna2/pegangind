const { get, all } = require('./db');

module.exports = async (req, res) => {
  const { resi } = req.query;

  if (!resi) {
    return res.status(400).json({ success: false, error: 'Nomor resi diperlukan' });
  }

  // Try resi_shopee
  let order = await get('SELECT * FROM orders WHERE resi_shopee = ?', [resi.trim()]);

  // Try order_id
  if (!order) {
    order = await get('SELECT * FROM orders WHERE order_id = ? COLLATE NOCASE', [resi.trim()]);
  }

  if (!order) {
    return res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' });
  }

  const images = await all('SELECT * FROM order_images WHERE order_id = ? ORDER BY uploaded_at DESC', [order.id]);
  const logs = await all('SELECT * FROM order_logs WHERE order_id = ? ORDER BY changed_at ASC', [order.id]);

  return res.json({ success: true, order: { ...order, images, logs } });
};
