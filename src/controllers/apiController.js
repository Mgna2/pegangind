const { syncGet, syncAll, syncRun } = require('../db/index');

const getStats = () => {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const totalIncome = syncGet(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type='income' AND date >= ?`, [firstOfMonth]);
  const activeOrders = syncGet(`SELECT COUNT(*) as count FROM orders WHERE status NOT IN ('Sudah Dikirim', 'Selesai')`);
  const completedMonth = syncGet(`SELECT COUNT(*) as count FROM orders WHERE status IN ('Selesai', 'Sudah Dikirim') AND updated_at >= ?`, [firstOfMonth]);
  const pendingOrders = syncGet(`SELECT COUNT(*) as count FROM orders WHERE status = 'Pesanan Masuk'`);

  const incomeChart = syncAll(`
    SELECT date, SUM(amount) as total
    FROM transactions
    WHERE date >= date('now', '-14 days')
    GROUP BY date
    ORDER BY date ASC
  `);

  return {
    totalIncome: totalIncome ? totalIncome.total : 0,
    activeOrders: activeOrders ? activeOrders.count : 0,
    completedMonth: completedMonth ? completedMonth.count : 0,
    pendingOrders: pendingOrders ? pendingOrders.count : 0,
    incomeChart,
  };
};

const trackOrder = (resi) => {
  const order = syncGet(`
    SELECT o.*, GROUP_CONCAT(oi.image_path, '|') as images
    FROM orders o
    LEFT JOIN order_images oi ON o.id = oi.order_id
    WHERE o.resi_shopee = ?
    GROUP BY o.id
  `, [resi.trim()]);

  if (!order) return null;

  const images = syncAll(`SELECT * FROM order_images WHERE order_id = ? ORDER BY uploaded_at DESC`, [order.id]);
  const logs = syncAll(`SELECT * FROM order_logs WHERE order_id = ? ORDER BY changed_at ASC`, [order.id]);

  return { ...order, images, logs };
};

const getAllOrders = (filters = {}) => {
  let query = `SELECT o.*, (SELECT COUNT(*) FROM order_images oi WHERE oi.order_id = o.id) as image_count FROM orders o`;
  const params = [];
  const conditions = [];

  if (filters.status) {
    conditions.push(`o.status = ?`);
    params.push(filters.status);
  }
  if (filters.search) {
    conditions.push(`(o.client_name LIKE ? OR o.order_id LIKE ? OR o.resi_shopee LIKE ?)`);
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
  query += ` ORDER BY o.created_at DESC`;

  return syncAll(query, params);
};

const getOrderById = (id) => {
  const order = syncGet(`SELECT * FROM orders WHERE id = ?`, [id]);
  if (!order) return null;
  const images = syncAll(`SELECT * FROM order_images WHERE order_id = ? ORDER BY uploaded_at DESC`, [id]);
  const logs = syncAll(`SELECT * FROM order_logs WHERE order_id = ? ORDER BY changed_at ASC`, [id]);
  return { ...order, images, logs };
};

const createOrder = (data) => {
  const { generateOrderId } = require('../utils/helpers');
  const orderId = data.order_id || generateOrderId();
  const result = syncRun(`
    INSERT INTO orders (order_id, client_name, whatsapp, resi_shopee, shopee_link, material, filament_color, status, notes)
    VALUES (@order_id, @client_name, @whatsapp, @resi_shopee, @shopee_link, @material, @filament_color, @status, @notes)
  `, { ...data, order_id: orderId, status: data.status || 'Pesanan Masuk' });

  syncRun(`INSERT INTO order_logs (order_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)`, [result.lastInsertRowid, null, data.status || 'Pesanan Masuk', 'admin']);

  return result.lastInsertRowid;
};

const ORDER_COLUMNS = ['client_name','whatsapp','resi_shopee','shopee_link','material','filament_color','status','notes','tracking_number','material_type','layer_height','gram_weight','total_price','payment_method','midtrans_order_id','midtrans_transaction_id','payment_status','email'];

const updateOrder = (id, data) => {
  const current = syncGet(`SELECT * FROM orders WHERE id = ?`, [id]);
  if (!current) return false;

  const safeData = {};
  ORDER_COLUMNS.forEach(col => {
    if (data[col] !== undefined && data[col] !== null) safeData[col] = data[col];
  });

  if (Object.keys(safeData).length > 0) {
    const fields = Object.keys(safeData).map(k => `${k} = @${k}`).join(', ');
    syncRun(`UPDATE orders SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`, { ...safeData, id });
  } else {
    syncRun(`UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
  }

  if (safeData.status && safeData.status !== current.status) {
    syncRun(`INSERT INTO order_logs (order_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)`, [id, current.status, safeData.status, 'admin']);
    if (safeData.status === 'Selesai') syncRun(`UPDATE orders SET completed_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
    if (safeData.status === 'Sudah Dikirim') syncRun(`UPDATE orders SET shipped_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
  }
  return true;
};

const deleteOrder = (id) => {
  syncRun(`DELETE FROM orders WHERE id = ?`, [id]);
};

const getPortfolio = (adminView = false) => {
  if (adminView) return syncAll(`SELECT * FROM portfolio ORDER BY created_at DESC`);
  return syncAll(`SELECT * FROM portfolio WHERE visible = 1 ORDER BY created_at DESC`);
};

const addPortfolioItem = (data) => {
  return syncRun(`INSERT INTO portfolio (title, description, category, image_path, visible) VALUES (@title, @description, @category, @image_path, @visible)`, data);
};

const updatePortfolioItem = (id, data) => {
  const safeData = {};
  Object.keys(data).forEach(k => {
    if (data[k] !== undefined) safeData[k] = data[k];
  });
  if (Object.keys(safeData).length === 0) return;
  const fields = Object.keys(safeData).map(k => `${k} = @${k}`).join(', ');
  syncRun(`UPDATE portfolio SET ${fields} WHERE id = @id`, { ...safeData, id });
};

const deletePortfolioItem = (id) => {
  syncRun(`DELETE FROM portfolio WHERE id = ?`, [id]);
};

const addOrderImage = (orderId, imagePath, imageType) => {
  syncRun(`INSERT INTO order_images (order_id, image_path, image_type) VALUES (?, ?, ?)`, [orderId, imagePath, imageType]);
};

const addTransaction = (data) => {
  syncRun(`INSERT INTO transactions (order_id, amount, type, description, date) VALUES (@order_id, @amount, @type, @description, @date)`, data);
};

module.exports = {
  getStats, trackOrder, getAllOrders, getOrderById, createOrder, updateOrder, deleteOrder,
  getPortfolio, addPortfolioItem, updatePortfolioItem, deletePortfolioItem,
  addOrderImage, addTransaction
};
