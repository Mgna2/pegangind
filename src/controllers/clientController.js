const { getPortfolio } = require('./apiController');
const { formatDate } = require('../utils/helpers');

const homePage = (req, res) => {
  const portfolio = getPortfolio(false).slice(0, 6);
  res.render('pages/home', { title: 'pegangind.com — Jasa 3D Printing Profesional', portfolio });
};

const trackPage = (req, res) => {
  res.render('pages/cek-pesanan', { title: 'Cek Pesanan — pegangind.com', result: null, resi: null, error: null });
};

const portfolioPage = (req, res) => {
  const items = getPortfolio(false);
  res.render('pages/portofolio', { title: 'Portofolio — pegangind.com', items });
};

const hargaPage = (req, res) => {
  res.render('pages/harga', { title: 'Harga — pegangind.com' });
};

const tentangPage = (req, res) => {
  res.render('pages/tentang', { title: 'Tentang Kami — pegangind.com' });
};

const kontakPage = (req, res) => {
  res.render('pages/kontak', { title: 'Kontak — pegangind.com', success: false });
};

const kontakSubmit = (req, res) => {
  res.render('pages/kontak', { title: 'Kontak — pegangind.com', success: true });
};

module.exports = { homePage, trackPage, portfolioPage, hargaPage, tentangPage, kontakPage, kontakSubmit };
