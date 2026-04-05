const { syncAll, syncGet } = require('../db/index');

const getPrices = () => {
  return syncAll('SELECT * FROM prices ORDER BY material, layer_height');
};

const getPrice = (material, layerHeight) => {
  return syncGet(
    'SELECT price_per_gram FROM prices WHERE material = ? AND layer_height = ?',
    [material, layerHeight]
  );
};

const calculatePrice = (material, layerHeight, gramWeight) => {
  const row = getPrice(material, layerHeight);
  if (!row) return null;
  return Math.round(row.price_per_gram * parseFloat(gramWeight));
};

module.exports = { getPrices, getPrice, calculatePrice };
