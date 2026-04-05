const { getPrices, getPrice, calculatePrice } = require('../utils/pricing');
const { syncGet } = require('../db/index');

const LAYER_HEIGHTS = ['0.08', '0.10', '0.12', '0.15', '0.20', '0.22'];

const MATERIALS = ['PLA', 'PETG'];

const MATERIAL_LABELS = { PLA: 'PLA', PETG: 'PETG' };

const cartPage = (req, res) => {
  const cart = req.session.cart || [];
  const prices = getPrices();
  res.render('pages/cart', {
    title: 'Keranjang — pegangind.com',
    cart,
    prices,
    LAYER_HEIGHTS,
    MATERIALS,
    MATERIAL_LABELS,
    added: req.query.added === '1',
    error: req.query.error,
  });
};

const addToCart = (req, res) => {
  const { material, layer_height, gram_weight } = req.body;
  const gram = parseFloat(gram_weight);

  if (!material || !layer_height || !gram || gram <= 0) {
    return res.redirect('/keranjang?error=invalid');
  }

  const priceRow = getPrice(material, layer_height);
  if (!priceRow) return res.redirect('/keranjang?error=price_not_found');

  const unitPrice = priceRow.price_per_gram;
  const linePrice = Math.round(unitPrice * gram);

  const item = {
    id: Date.now(),
    material,
    layerHeight: layer_height,
    gramWeight: gram,
    unitPrice,
    linePrice,
  };

  if (!req.session.cart) req.session.cart = [];
  req.session.cart.push(item);

  res.redirect('/keranjang?added=1');
};

const removeFromCart = (req, res) => {
  const { itemId } = req.body;
  if (req.session.cart && itemId !== undefined) {
    req.session.cart = req.session.cart.filter(i => String(i.id) !== String(itemId));
  }
  res.redirect('/keranjang');
};

const clearCart = (req, res) => {
  req.session.cart = [];
  res.redirect('/keranjang');
};

const checkoutPage = (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect('/keranjang');
  const prices = getPrices();

  let clientData = null;
  if (req.session.isClient && req.session.clientId) {
    const client = syncGet(
      'SELECT name, email, phone, address, province, city, postal_code FROM clients WHERE id = ?',
      [req.session.clientId]
    );
    if (client) {
      clientData = {
        name: client.name,
        email: client.email,
        phone: client.phone || '',
        address: client.address || '',
        province: client.province || '',
        city: client.city || '',
        postal_code: client.postal_code || '',
      };
    }
  }

  res.render('pages/checkout', {
    title: 'Checkout — pegangind.com',
    cart,
    prices,
    LAYER_HEIGHTS,
    MATERIALS,
    MATERIAL_LABELS,
    clientData,
    error: null,
  });
};

module.exports = {
  cartPage, addToCart, removeFromCart, clearCart,
  checkoutPage, LAYER_HEIGHTS, MATERIALS, MATERIAL_LABELS,
};
