const express = require('express');
const router = express.Router();
const path = require('path');
const { renderRegister, handleRegister, handleVerify, renderLogin, handleLogin, handleLogout, renderAccount, handleAccountUpdate, renderChat, renderOrderHistory, renderOrderDetail } = require('../controllers/clientAuthController');
const { requireClientAuth } = require('../middleware/auth');
const { uploadChat } = require('../middleware/upload');

// Chat file upload — accepts image or zip (auto-detected)
router.post('/chat/upload', requireClientAuth, (req, res) => {
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

router.get('/daftar', renderRegister);
router.post('/daftar', handleRegister);
router.get('/verify/:token', handleVerify);
router.get('/masuk', renderLogin);
router.post('/masuk', handleLogin);
router.post('/keluar', handleLogout);
router.get('/akun', requireClientAuth, renderAccount);
router.post('/akun', requireClientAuth, handleAccountUpdate);
router.get('/akun/pesanan', requireClientAuth, renderOrderHistory);
router.get('/akun/pesanan/:id', requireClientAuth, renderOrderDetail);
router.get('/chat', requireClientAuth, renderChat);

module.exports = router;
