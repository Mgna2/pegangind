const bcrypt = require('bcrypt');
const { sqlite, syncGet, syncAll, syncRun } = require('../db/index');
const { setAuthCookie, clearAuthCookie } = require('../../api/auth');
const {
  getStats, getAllOrders, getOrderById, createOrder, updateOrder, deleteOrder,
  getPortfolio, addPortfolioItem, updatePortfolioItem, deletePortfolioItem,
  addOrderImage, addTransaction
} = require('./apiController');
const { generateOrderId, generateWAMessage, formatRupiah, formatDate, formatDateTime } = require('../utils/helpers');

// --- Auth ---
const loginPage = (req, res) => {
  res.render('admin/login', { title: 'Login Admin', error: null });
};

const loginHandler = async (req, res) => {
  const { username, password } = req.body;
  const user = syncGet('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return res.render('admin/login', { title: 'Login Admin', error: 'Username atau password salah' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.render('admin/login', { title: 'Login Admin', error: 'Username atau password salah' });

  if (process.env.VERCEL === 'true') {
    setAuthCookie(res, { userId: user.id, username: user.username, role: user.role });
    return res.redirect('/admin/dashboard');
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  res.redirect('/admin/dashboard');
};

const logoutHandler = (req, res) => {
  if (process.env.VERCEL === 'true') {
    clearAuthCookie(res);
    return res.redirect('/admin');
  }
  req.session.destroy(() => {
    res.redirect('/admin');
  });
};

// --- Dashboard ---
const dashboardPage = (req, res) => {
  const stats = getStats();
  const recentOrders = syncAll(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 10`);
  res.render('admin/dashboard', {
    title: 'Dashboard Admin',
    stats,
    recentOrders,
    formatRupiah,
    formatDate,
    formatDateTime,
    username: req.session.username,
  });
};

// --- Orders ---
const ordersPage = (req, res) => {
  const { status, search } = req.query;
  const orders = getAllOrders({ status, search });
  res.render('admin/orders', {
    title: 'Semua Pesanan',
    orders,
    filters: { status, search },
    formatDate,
    username: req.session.username,
  });
};

const orderNewPage = (req, res) => {
  res.render('admin/order-new', {
    title: 'Tambah Pesanan',
    generateOrderId,
    username: req.session.username,
  });
};

const orderCreateHandler = async (req, res) => {
  try {
    const orderId = createOrder(req.body);
    
    // Handle image uploads
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        addOrderImage(orderId, `/uploads/orders/${file.filename}`, req.body.image_type || 'design');
      });
    }
    
    // Handle transaction if amount provided
    if (req.body.amount) {
      addTransaction({
        order_id: orderId,
        amount: parseInt(req.body.amount),
        type: 'income',
        description: `Order ${req.body.order_id} - ${req.body.client_name}`,
        date: new Date().toISOString().slice(0, 10),
      });
    }
    
    res.redirect('/admin/pesanan');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating order');
  }
};

const orderEditPage = (req, res) => {
  const order = getOrderById(req.params.id);
  if (!order) return res.status(404).send('Pesanan tidak ditemukan');
  res.render('admin/order-edit', {
    title: `Edit Pesanan ${order.order_id}`,
    order,
    generateWAMessage,
    formatDate,
    formatDateTime,
    username: req.session.username,
  });
};

const orderUpdateHandler = async (req, res) => {
  try {
    const id = req.params.id;
    // Strip non-column fields before passing to updateOrder
    const updateData = { ...req.body };
    delete updateData.amount;
    delete updateData.image_type;
    
    updateOrder(id, updateData);
    
    // Handle image uploads
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        addOrderImage(id, `/uploads/orders/${file.filename}`, req.body.image_type || 'process');
      });
    }
    
    // Handle transaction if amount provided
    if (req.body.amount) {
      addTransaction({
        order_id: id,
        amount: parseInt(req.body.amount),
        type: 'income',
        description: `Update Order #${req.body.order_id}`,
        date: new Date().toISOString().slice(0, 10),
      });
    }
    
    res.redirect(`/admin/pesanan/${id}/edit`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating order');
  }
};

const orderDeleteHandler = (req, res) => {
  deleteOrder(req.params.id);
  res.redirect('/admin/pesanan');
};

const orderImageDeleteHandler = (req, res) => {
  syncRun(`DELETE FROM order_images WHERE id = ?`, [req.params.imageId]);
  res.json({ success: true });
};

// --- Portfolio Admin ---
const portfolioAdminPage = (req, res) => {
  const items = getPortfolio(true);
  res.render('admin/portfolio-admin', {
    title: 'Kelola Portofolio',
    items,
    username: req.session.username,
  });
};

const portfolioCreateHandler = (req, res) => {
  const imagePath = req.file ? `/uploads/portfolio/${req.file.filename}` : null;
  addPortfolioItem({
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    image_path: imagePath,
    visible: req.body.visible === 'on' ? 1 : 0,
  });
  res.redirect('/admin/portofolio');
};

const portfolioUpdateHandler = (req, res) => {
  // Only include fields that were actually submitted (so toggle-visible doesn't null title etc.)
  const data = {};
  if (req.body.title !== undefined)       data.title       = req.body.title;
  if (req.body.description !== undefined) data.description = req.body.description;
  if (req.body.category !== undefined)    data.category    = req.body.category;
  if (req.body.visible !== undefined)     data.visible     = req.body.visible === 'on' ? 1 : 0;
  if (req.file) data.image_path = `/uploads/portfolio/${req.file.filename}`;
  updatePortfolioItem(req.params.id, data);
  res.redirect('/admin/portofolio');
};

const portfolioDeleteHandler = (req, res) => {
  deletePortfolioItem(req.params.id);
  res.redirect('/admin/portofolio');
};

// --- Chat Panel ---
// --- Midtrans Orders (Admin) ---
const { getPrices } = require('../utils/pricing');

const midtransOrdersPage = (req, res) => {
  const { status, search } = req.query;
  let query = `SELECT * FROM orders WHERE payment_method = 'midtrans'`;
  const params = [];

  if (status && status !== '') {
    query += ` AND payment_status = ?`;
    params.push(status);
  }
  if (search) {
    query += ` AND (client_name LIKE ? OR order_id LIKE ? OR midtrans_order_id LIKE ? OR whatsapp LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  query += ` ORDER BY created_at DESC`;

  const orders = syncAll(query, params);
  res.render('admin/midtrans-orders', {
    title: 'Pesanan Midtrans',
    orders,
    filters: { status, search },
    formatDate,
    formatRupiah,
    username: req.session.username,
    currentPage: 'midtrans-orders',
  });
};

const midtransOrderEditPage = (req, res) => {
  const order = syncGet(
    `SELECT * FROM orders WHERE id = ? AND payment_method = 'midtrans'`,
    [req.params.id]
  );
  if (!order) return res.status(404).send('Pesanan tidak ditemukan');
  const prices = getPrices();
  const docImages = syncAll(
    `SELECT * FROM order_images WHERE order_id = ? AND image_type = 'documentation' ORDER BY uploaded_at DESC`,
    [req.params.id]
  );
  res.render('admin/midtrans-edit', {
    title: `Edit Pesanan ${order.order_id}`,
    order,
    docImages,
    prices,
    formatDate,
    formatDateTime,
    formatRupiah,
    username: req.session.username,
    currentPage: 'midtrans-orders',
  });
};

const midtransOrderUpdateHandler = (req, res) => {
  const {
    material_type, layer_height, gram_weight, payment_status,
    tracking_number, notes, whatsapp, email, status,
    address, city, province, postal_code,
  } = req.body;

  // Recalculate price if product fields changed
  let totalPrice = null;
  if (material_type && layer_height && gram_weight) {
    const priceRow = syncGet(
      `SELECT price_per_gram FROM prices WHERE material = ? AND layer_height = ?`,
      [material_type, layer_height]
    );
    if (priceRow) totalPrice = Math.round(priceRow.price_per_gram * parseFloat(gram_weight));
  }

  const fields = [];
  const vals = {};

  if (material_type !== undefined)     { fields.push('material_type = @material_type');     vals.material_type = material_type; }
  if (layer_height !== undefined)       { fields.push('layer_height = @layer_height');        vals.layer_height = layer_height; }
  if (gram_weight !== undefined)        { fields.push('gram_weight = @gram_weight');          vals.gram_weight = gram_weight; }
  if (totalPrice !== null)             { fields.push('total_price = @total_price');          vals.total_price = totalPrice; }
  if (payment_status !== undefined)    { fields.push('payment_status = @payment_status');    vals.payment_status = payment_status; }
  if (tracking_number !== undefined)   { fields.push('tracking_number = @tracking_number');   vals.tracking_number = tracking_number; }
  if (notes !== undefined)             { fields.push('notes = @notes');                      vals.notes = notes; }
  if (whatsapp !== undefined)         { fields.push('whatsapp = @whatsapp');                vals.whatsapp = whatsapp; }
  if (email !== undefined)            { fields.push('email = @email');                      vals.email = email; }
  if (status !== undefined)           { fields.push('status = @status');                    vals.status = status; }
  if (address !== undefined)          { fields.push('address = @address');                  vals.address = address; }
  if (city !== undefined)             { fields.push('city = @city');                       vals.city = city; }
  if (province !== undefined)          { fields.push('province = @province');                vals.province = province; }
  if (postal_code !== undefined)      { fields.push('postal_code = @postal_code');          vals.postal_code = postal_code; }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  vals.id = req.params.id;

  if (fields.length > 1) {
    syncRun(`UPDATE orders SET ${fields.join(', ')} WHERE id = @id`, vals);
  }

  // Handle documentation image uploads
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      addOrderImage(req.params.id, `/uploads/orders/${file.filename}`, 'documentation');
    });
  }

  res.redirect('/admin/pesanan-midtrans/' + req.params.id + '/edit');
};

// --- Chat Panel ---
const chatPanel = (req, res) => {
  const conversations = syncAll(`
    SELECT cc.*, c.name, c.email, c.client_id,
      (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = cc.id AND sender_type = 'client' AND read_at IS NULL) as unread_count,
      (SELECT message FROM chat_messages WHERE conversation_id = cc.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM chat_messages WHERE conversation_id = cc.id ORDER BY created_at DESC LIMIT 1) as last_message_at
    FROM chat_conversations cc
    JOIN clients c ON cc.client_id = c.id
    ORDER BY cc.updated_at DESC
  `);

  res.render('admin/chat', {
    title: 'Live Chat',
    conversations,
    username: req.session.username,
    currentPage: 'chat',
  });
};

module.exports = {
  loginPage, loginHandler, logoutHandler, dashboardPage,
  ordersPage, orderNewPage, orderCreateHandler, orderEditPage,
  orderUpdateHandler, orderDeleteHandler, orderImageDeleteHandler,
  portfolioAdminPage, portfolioCreateHandler, portfolioUpdateHandler, portfolioDeleteHandler,
  chatPanel,
  midtransOrdersPage, midtransOrderEditPage, midtransOrderUpdateHandler,
};
