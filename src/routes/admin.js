const express = require('express');
const router = express.Router();
const { requireAuth, redirectIfAuth } = require('../middleware/auth');
const { uploadOrders, uploadPortfolio, uploadChat } = require('../middleware/upload');
const { syncRun } = require('../db/index');
const path = require('path');
const {
  loginPage, loginHandler, logoutHandler, dashboardPage,
  ordersPage, orderNewPage, orderCreateHandler, orderEditPage,
  orderUpdateHandler, orderDeleteHandler, orderImageDeleteHandler,
  portfolioAdminPage, portfolioCreateHandler, portfolioUpdateHandler, portfolioDeleteHandler,
  chatPanel,
  midtransOrdersPage, midtransOrderEditPage, midtransOrderUpdateHandler,
} = require('../controllers/adminController');

// Auth
router.get('/', redirectIfAuth, loginPage);
router.post('/login', loginHandler);
router.post('/logout', logoutHandler);

// Dashboard
router.get('/dashboard', requireAuth, dashboardPage);

// Orders
router.get('/pesanan', requireAuth, ordersPage);
router.get('/pesanan/baru', requireAuth, orderNewPage);
router.post('/pesanan', requireAuth, uploadOrders.array('images', 10), orderCreateHandler);
router.get('/pesanan/:id/edit', requireAuth, orderEditPage);
router.post('/pesanan/:id', requireAuth, uploadOrders.array('images', 10), orderUpdateHandler);
router.post('/pesanan/:id/delete', requireAuth, orderDeleteHandler);
router.delete('/pesanan/:id/images/:imageId', requireAuth, orderImageDeleteHandler);
router.delete('/pesanan-midtrans/:id/images/:imageId', requireAuth, (req, res) => {
  syncRun(`DELETE FROM order_images WHERE id = ?`, [req.params.imageId]);
  res.json({ success: true });
});

// Midtrans Orders
router.get('/pesanan-midtrans', requireAuth, midtransOrdersPage);
router.get('/pesanan-midtrans/:id/edit', requireAuth, midtransOrderEditPage);
router.post('/pesanan-midtrans/:id', requireAuth, uploadOrders.array('doc_images', 10), midtransOrderUpdateHandler);

// Portfolio
router.get('/portofolio', requireAuth, portfolioAdminPage);
router.post('/portofolio', requireAuth, uploadPortfolio.single('image'), portfolioCreateHandler);
router.post('/portofolio/:id', requireAuth, uploadPortfolio.single('image'), portfolioUpdateHandler);
router.post('/portofolio/:id/delete', requireAuth, portfolioDeleteHandler);

// Chat
router.get('/chat', requireAuth, chatPanel);

// Chat file upload — accepts image or zip (auto-detected)
router.post('/chat/upload', requireAuth, (req, res) => {
  uploadChat.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File tidak ditemukan' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileType = imageExts.includes(ext) ? 'image' : 'file';

    res.json({
      success: true,
      file_path: req.file.path.replace(/^.*\/public/, ''),
      file_name: req.file.originalname,
      file_type: fileType,
    });
  });
});

module.exports = router;
