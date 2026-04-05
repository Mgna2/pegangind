const midtransClient = require('midtrans-client');
const { sqlite, syncGet, syncAll, syncRun } = require('../db/index');
const { generateOrderId } = require('../utils/helpers');
const { calculatePrice } = require('../utils/pricing');

// Midtrans Sandbox credentials
const MIDTRANS_MERCHANT_ID = 'G884817277';
const MIDTRANS_SERVER_KEY = 'SB-Mid-server-6xxLBagbUWa9f5r9FitzJn40';
const MIDTRANS_CLIENT_KEY = 'SB-Mid-client-cQhi1mAuLZkw51Yq';

let SNAP;
const getSnap = () => {
  if (!SNAP) {
    SNAP = new midtransClient.Snap({
      isProduction: false,
      serverKey: MIDTRANS_SERVER_KEY,
      clientKey: MIDTRANS_CLIENT_KEY,
    });
  }
  return SNAP;
};

// POST /api/midtrans/snap-token
const getSnapToken = (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.status(400).json({ success: false, error: 'Keranjang kosong' });

  const { client_name, whatsapp, email, notes } = req.body;
  if (!client_name || !whatsapp || !email) {
    return res.status(400).json({ success: false, error: 'Data klien tidak lengkap' });
  }

  const midtransOrderId = `MT-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

  const itemDetails = cart.map(item => ({
    id: String(item.id),
    name: `${item.material} ${item.layerHeight}mm`,
    quantity: 1,
    price: Math.round(item.linePrice),
    category: '3D Printing',
  }));

  const grossAmount = Math.round(itemDetails.reduce((s, i) => s + i.price * i.quantity, 0));

  // Format: yyyy-MM-dd hh:mm:ss +07:00 (WIB — Midtrans requirement)
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const startTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} +07:00`;

  const parameter = {
    transaction_details: {
      order_id: midtransOrderId,
      gross_amount: grossAmount,
    },
    customer_details: {
      first_name: client_name,
      phone: whatsapp.replace(/^0/, '62'),
      email: email,
    },
    item_details: itemDetails,
    credit_card: {
      secure: true
    },
    callbacks: {
      finish: `${process.env.APP_BASE_URL}/konfirmasi-pesanan?order_id=${midtransOrderId}`,
    },
    expiry: {
      start_time: startTime,
      unit: 'days',
      duration: 1,
    },
  };

  getSnap().createTransaction(parameter).then(transaction => {
    res.json({ success: true, token: transaction.token, midtransOrderId });
  }).catch(err => {
    console.error('Midtrans token error:', err);
    console.error('Error details:', err.rawResponse, err.httpStatusCode);
    res.status(500).json({
      success: false,
      error: 'Gagal membuat token pembayaran',
      debug: err.message
    });
  });
};

// POST /api/midtrans/webhook — raw body, no JSON parsing
const webhookHandler = (req, res) => {
  let event;
  try {
    event = JSON.parse(req.body.toString());
  } catch (_) {
    return res.status(400).json({ status: 'error', message: 'Invalid JSON' });
  }

  const { order_id, transaction_status, transaction_id } = event;
  if (!order_id) return res.status(400).json({ status: 'error' });

  try {
    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      syncRun(`
        UPDATE orders SET payment_status = 'paid',
          midtrans_transaction_id = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE midtrans_order_id = ?
      `, [transaction_id || null, order_id]);
    } else if (transaction_status === 'expire') {
      syncRun(`
        UPDATE orders SET payment_status = 'expire',
          updated_at = CURRENT_TIMESTAMP
        WHERE midtrans_order_id = ?
      `, [order_id]);
    } else if (transaction_status === 'cancel' || transaction_status === 'deny') {
      syncRun(`
        UPDATE orders SET payment_status = 'unpaid',
          updated_at = CURRENT_TIMESTAMP
        WHERE midtrans_order_id = ?
      `, [order_id]);
    }
  } catch (err) {
    console.error('Midtrans webhook error:', err);
  }

  res.status(200).json({ status: 'ok' });
};

// POST /api/midtrans/create-order
const createOrder = (req, res) => {
  const { midtransOrderId, client_name, whatsapp, email, notes, cart, address, city, province, postal_code } = req.body;
  let cartItems;
  try {
    cartItems = JSON.parse(cart || '[]');
  } catch (_) {
    cartItems = [];
  }

  if (!cartItems.length) return res.status(400).json({ success: false, error: 'Cart kosong' });

  const clientId = req.session.clientId || null;

  try {
    cartItems.forEach(item => {
      const totalPrice = calculatePrice(item.material, item.layerHeight, item.gramWeight);
      const pgOrderId = generateOrderId();

      syncRun(`
        INSERT INTO orders (
          order_id, client_name, whatsapp, email, notes,
          material_type, layer_height, gram_weight, total_price,
          payment_method, midtrans_order_id, payment_status,
          status, material, address, city, province, postal_code, client_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'midtrans', ?, 'pending', 'Pesanan Masuk', ?, ?, ?, ?, ?, ?)
      `, [
        pgOrderId, client_name, whatsapp, email, notes || '',
        item.material, item.layerHeight, item.gramWeight, totalPrice,
        midtransOrderId, item.material,
        address || null, city || null, province || null, postal_code || null,
        clientId
      ]);
    });

    req.session.cart = [];
    res.json({ success: true, orderId: midtransOrderId });
  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ success: false, error: 'Gagal menyimpan pesanan' });
  }
};

// GET /konfirmasi-pesanan
const konfirmasiPage = (req, res) => {
  const { order_id } = req.query;
  if (!order_id) return res.redirect('/');

  const orders = syncAll(
    `SELECT * FROM orders WHERE midtrans_order_id = ? ORDER BY created_at DESC`,
    [order_id]
  );

  if (!orders.length) return res.redirect('/');

  const primary = orders[0];
  res.render('pages/konfirmasi-pesanan', {
    title: 'Konfirmasi Pesanan — pegangind.com',
    order: primary,
    allItems: orders,
  });
};

// GET /api/midtrans/pay-link — re-fetch Snap token for pending orders
const getPayLink = (req, res) => {
  const { order_id } = req.query;
  if (!order_id) return res.status(400).json({ success: false });

  const orders = syncAll(
    `SELECT * FROM orders WHERE midtrans_order_id = ? AND payment_status = 'pending'`,
    [order_id]
  );
  if (!orders.length) return res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan atau sudah dibayar' });

  const primary = orders[0];
  const midtransOrderId = primary.midtrans_order_id;

  const itemDetails = orders.map(o => ({
    id: String(o.id),
    name: `${o.material_type || o.material} ${o.layer_height}mm`,
    quantity: 1,
    price: Math.round(o.total_price),
    category: '3D Printing',
  }));

  const grossAmount = Math.round(itemDetails.reduce((s, i) => s + i.price, 0));

  // Format: yyyy-MM-dd hh:mm:ss +07:00 (WIB — Midtrans requirement)
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const startTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} +07:00`;

  const parameter = {
    transaction_details: {
      order_id: midtransOrderId,
      gross_amount: grossAmount,
    },
    customer_details: {
      first_name: primary.client_name,
      phone: (primary.whatsapp || '').replace(/^0/, '62'),
      email: primary.email || '',
    },
    item_details: itemDetails,
    credit_card: {
      secure: true
    },
    callbacks: {
      finish: `${process.env.APP_BASE_URL}/konfirmasi-pesanan?order_id=${midtransOrderId}`,
    },
    expiry: {
      start_time: startTime,
      unit: 'days',
      duration: 1,
    },
  };

  getSnap().createTransaction(parameter).then(transaction => {
    res.json({ success: true, token: transaction.token, midtransOrderId });
  }).catch(err => {
    console.error('Midtrans pay-link error:', err);
    console.error('Error details:', err.rawResponse, err.httpStatusCode);
    res.status(500).json({
      success: false,
      error: 'Gagal membuat link pembayaran',
      debug: err.message
    });
  });
};

module.exports = { getSnapToken, webhookHandler, createOrder, konfirmasiPage, getPayLink };
