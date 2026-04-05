const express = require('express');
const router = express.Router();
const { getSnapToken, webhookHandler, createOrder, getPayLink } = require('../controllers/midtransController');

// Called from checkout page via AJAX — get Snap token
router.post('/snap-token', getSnapToken);

// Called from checkout page after Snap popup — save order to DB
router.post('/create-order', createOrder);

// Re-fetch Snap token for pending orders (continue payment)
router.get('/pay-link', getPayLink);

// Midtrans server-to-server webhook — raw body (must be BEFORE global express.json)
router.post('/webhook', express.raw({ type: 'application/json' }), webhookHandler);

module.exports = router;
