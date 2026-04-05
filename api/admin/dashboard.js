const { requireAdminAuth } = require('../auth');
const { get: dbGet, all: dbAll } = require('../db');

module.exports = async (req, res) => {
  const auth = requireAdminAuth(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const thisMonth = new Date().toISOString().slice(0, 7);

  const totalIncome = await dbGet(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND strftime('%Y-%m', date) = ?`,
    [thisMonth]
  );
  const activeOrders = await dbGet(
    `SELECT COUNT(*) as count FROM orders WHERE status NOT IN ('Selesai', 'Sudah Dikirim', 'Cancelled')`
  );
  const completedOrders = await dbGet(
    `SELECT COUNT(*) as count FROM orders WHERE status IN ('Selesai', 'Sudah Dikirim') AND strftime('%Y-%m', updated_at) = ?`,
    [thisMonth]
  );
  const pendingOrders = await dbGet(
    `SELECT COUNT(*) as count FROM orders WHERE status = 'Pesanan Masuk'`
  );

  const recentOrders = await dbAll(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 10`);

  return res.json({
    success: true,
    stats: {
      totalIncome: totalIncome?.total || 0,
      activeOrders: activeOrders?.count || 0,
      completedOrders: completedOrders?.count || 0,
      pendingOrders: pendingOrders?.count || 0,
    },
    recentOrders,
    username: auth.username,
  });
};
