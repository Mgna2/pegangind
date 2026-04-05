// Auth middleware — supports both session (local) and JWT cookie (Vercel)
const { requireAdminAuth } = require('../api/auth');

const requireAuth = (req, res, next) => {
  // Vercel: check JWT cookie
  if (process.env.VERCEL === 'true') {
    const payload = requireAdminAuth(req);
    if (payload) {
      req.session = { userId: payload.userId, username: payload.username };
      return next();
    }
    return res.redirect('/admin');
  }
  // Local: use session
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect('/admin');
};

const redirectIfAuth = (req, res, next) => {
  if (process.env.VERCEL === 'true') {
    const payload = requireAdminAuth(req);
    if (payload) return res.redirect('/admin/dashboard');
    return next();
  }
  if (req.session && req.session.userId) {
    return res.redirect('/admin/dashboard');
  }
  next();
};

const requireClientAuth = (req, res, next) => {
  if (req.session && req.session.isClient) {
    return next();
  }
  res.redirect('/masuk?redirect=' + encodeURIComponent(req.originalUrl));
};

module.exports = { requireAuth, redirectIfAuth, requireClientAuth };
