const express = require('express');
const router = express.Router();
const { homePage, trackPage, portfolioPage, hargaPage, tentangPage, kontakPage, kontakSubmit } = require('../controllers/clientController');
const { cartPage, addToCart, removeFromCart, clearCart, checkoutPage } = require('../controllers/cartController');
const { konfirmasiPage } = require('../controllers/midtransController');
const { requireClientAuth } = require('../middleware/auth');

router.get('/', homePage);
router.get('/cek-pesanan', trackPage);
router.get('/portofolio', portfolioPage);
router.get('/harga', hargaPage);
router.get('/tentang', tentangPage);
router.get('/kontak', kontakPage);
router.post('/kontak', kontakSubmit);

// Cart & Checkout
router.get('/keranjang', cartPage);
router.post('/keranjang/tambah', addToCart);
router.post('/keranjang/hapus', removeFromCart);
router.post('/keranjang/clear', clearCart);
router.get('/checkout', requireClientAuth, checkoutPage);
router.get('/konfirmasi-pesanan', konfirmasiPage);

module.exports = router;
