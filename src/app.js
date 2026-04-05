const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// Only init DB in local dev; on Vercel it's handled in server.js
if (process.env.VERCEL !== 'true') {
  const { initDB } = require('./db/index');
  initDB();
}

const clientRoutes = require('./routes/client');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const clientAuthRoutes = require('./routes/clientAuth');
const midtransRoutes = require('./routes/midtrans');

const app = express();

// View engine
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'pegangind_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Method override for PUT/DELETE via POST
app.use((req, res, next) => {
  if (req.body && req.body._method) {
    req.method = req.body._method;
    delete req.body._method;
  }
  next();
});

// Inject client user into all EJS templates — MUST be before routes
app.use((req, res, next) => {
  res.locals.clientUser = (req.session && req.session.isClient) ? {
    id: req.session.clientId,
    name: req.session.clientName,
    uuid: req.session.clientUuid,
    email: req.session.clientEmail,
    phone: req.session.clientPhone || '',
  } : null;
  next();
});

// Inject Midtrans client key for Snap.js
app.use((req, res, next) => {
  res.locals.midtransClientKey = 'SB-Mid-client-cQhi1mAuLZkw51Yq';
  next();
});

// Routes
app.use('/api', apiRoutes);
app.use('/api/midtrans', midtransRoutes);
app.use('/admin', adminRoutes);
app.use('/', clientAuthRoutes);
app.use('/', clientRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('pages/home', { title: 'Halaman tidak ditemukan', portfolio: [] });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Terjadi kesalahan server');
});

module.exports = app;
