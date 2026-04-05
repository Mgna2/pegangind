const { get } = require('./db');

// getPrices — mirrors utils/pricing.js but uses async DB
async function getPrices() {
  const rows = await get('SELECT material, layer_height, price_per_gram FROM prices ORDER BY material, layer_height');
  return rows;
}

module.exports = async (req, res) => {
  const prices = await getPrices();
  return res.json({ success: true, prices });
};
