require('dotenv').config();
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = require('./app');
const PORT = process.env.PORT || 3000;
const isVercel = process.env.VERCEL === 'true';

// Register Vercel API routes
if (isVercel) {
  // These handlers use async @libsql/client — not Socket.io
  app.use('/api/admin/login',      require('../api/admin/login'));
  app.use('/api/admin/logout',     require('../api/admin/logout'));
  app.use('/api/admin/dashboard',  require('../api/admin/dashboard'));
  app.use('/api/admin/orders',     require('../api/admin/orders'));
  app.use('/api/admin/upload',     require('../api/admin/upload'));
  app.use('/api/admin/portfolio',  require('../api/admin/portfolio'));
  app.use('/api/chat/poll',        require('../api/chat/poll'));
  app.use('/api/chat/send',       require('../api/chat/send'));
  app.use('/api/chat/upload',     require('../api/chat/upload'));
  app.use('/api/track',            require('../api/track'));
  app.use('/api/prices',           require('../api/prices'));
  app.use('/api/order',            require('../api/order'));
}

// Vercel serverless: export Express app as handler
if (isVercel) {
  module.exports = app;
  return;
}

// Local dev: start HTTP server with Socket.io
const { initDB } = require('./db/index');
initDB();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
app.set('io', io);
require('./socket/chatHandler')(io);

httpServer.listen(PORT, () => {
  console.log(`🚀 pegangind.com server running at http://localhost:${PORT}`);
  console.log(`📊 Admin dashboard: http://localhost:${PORT}/admin`);
  console.log(`🔑 Login: admin / pegangind2024`);
  console.log(`💬 Live Chat: Socket.io enabled`);
});
