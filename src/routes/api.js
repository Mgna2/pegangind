const express = require('express');
const router = express.Router();
const { trackOrder } = require('../controllers/apiController');
const { getPrices } = require('../utils/pricing');
const { syncGet } = require('../db/index');

// Public API: Track order by resi or order_id
router.get('/track', (req, res) => {
  const { resi } = req.query;
  if (!resi) return res.json({ success: false, error: 'Nomor resi diperlukan' });

  let order = trackOrder(resi);
  if (!order) {
    const byOrderId = syncGet(`
      SELECT * FROM orders WHERE order_id = ? COLLATE NOCASE
    `, [resi.trim()]);
    if (byOrderId) {
      const images = require('../db/index').syncAll(`SELECT * FROM order_images WHERE order_id = ? ORDER BY uploaded_at DESC`, [byOrderId.id]);
      const logs = require('../db/index').syncAll(`SELECT * FROM order_logs WHERE order_id = ? ORDER BY changed_at ASC`, [byOrderId.id]);
      order = { ...byOrderId, images, logs };
    }
  }

  if (!order) return res.json({ success: false, error: 'Pesanan tidak ditemukan' });

  res.json({ success: true, order });
});

// Public API: Track order by order_id (for Midtrans orders)
router.get('/order', (req, res) => {
  const { order_id } = req.query;
  if (!order_id) return res.json({ success: false, error: 'order_id diperlukan' });

  const order = syncGet(`
    SELECT * FROM orders WHERE order_id = ? COLLATE NOCASE
  `, [order_id.trim()]);

  if (!order) return res.json({ success: false, error: 'Pesanan tidak ditemukan' });

  const images = require('../db/index').syncAll(`SELECT * FROM order_images WHERE order_id = ? ORDER BY uploaded_at DESC`, [order.id]);
  const logs = require('../db/index').syncAll(`SELECT * FROM order_logs WHERE order_id = ? ORDER BY changed_at ASC`, [order.id]);

  res.json({ success: true, order: { ...order, images, logs } });
});

// Public API: Get pricing table
router.get('/prices', (req, res) => {
  res.json({ success: true, prices: getPrices() });
});

module.exports = router;
