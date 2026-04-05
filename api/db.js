/**
 * Vercel-compatible database client using @libsql/client (Turso).
 * Works locally with a SQLite file and in production with Turso cloud DB.
 *
 * IMPORTANT: @libsql/client only supports ASYNC operations.
 * Always use await when calling db methods.
 */
const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Determine DB source
const isProd = process.env.VERCEL === 'true';
const dbUrl = process.env.TURSO_DATABASE_URL;
const dbAuthToken = process.env.TURSO_AUTH_TOKEN;

// For local dev without Turso: use a file-based SQLite
let db;

function getDb() {
  if (db) return db;

  if (isProd && dbUrl) {
    // Production: connect to Turso cloud
    db = createClient({ url: dbUrl, authToken: dbAuthToken });
  } else if (!isProd) {
    // Local dev: use libsql local file
    const localPath = process.env.TURSO_DATABASE_URL || 'local:./data/pegangind.db';
    db = createClient({ url: localPath });
  } else {
    // Prod but no TURSO_URL configured — use in-memory (limited, for demo)
    db = createClient({ url: 'file::memory:' });
  }

  return db;
}

// Run a query and return rows (async)
async function all(sql, params = []) {
  const result = await getDb().execute({ sql, args: params });
  return result.rows;
}

// Run a query and return first row (async)
async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0] || null;
}

// Run a query and return { lastInsertRowid, rowsAffected } (async)
async function run(sql, params = []) {
  const args = Array.isArray(params) ? params : params;
  const result = await getDb().execute({ sql, args });
  return { lastInsertRowid: result.lastInsertRowid, rowsAffected: result.rowsAffected };
}

// ---- Sync wrappers for backward compat with existing sync code ----
// These run in-process — only use for non-performance-critical init code.
let _syncDb = null;
function getSyncDb() {
  if (_syncDb) return _syncDb;

  if (isProd && dbUrl) {
    // Sync mode via HTTP (not recommended for hot paths on serverless)
    _syncDb = createClient({ url: dbUrl, authToken: dbAuthToken });
  } else {
    const localPath = process.env.TURSO_DATABASE_URL || 'local:./data/pegangind.db';
    _syncDb = createClient({ url: localPath });
  }
  return _syncDb;
}

// Sync version (for init/seed only — each call creates a new connection)
function runSync(sql, params = []) {
  const client = getSyncDb();
  return client.execute({ sql, args: params });
}

// ---- DB Init ----
async function initDB() {
  const client = getDb();

  await client.executeMultiple(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id VARCHAR(50) UNIQUE NOT NULL,
      client_name VARCHAR(255) NOT NULL,
      whatsapp VARCHAR(20),
      resi_shopee VARCHAR(100),
      shopee_link VARCHAR(500),
      material VARCHAR(100),
      filament_color VARCHAR(50),
      status VARCHAR(50) DEFAULT 'Pesanan Masuk',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      shipped_at DATETIME,
      tracking_number VARCHAR(100),
      address TEXT,
      province VARCHAR(100),
      city VARCHAR(100),
      postal_code VARCHAR(10),
      client_id INTEGER,
      material_type VARCHAR(20),
      layer_height VARCHAR(10),
      gram_weight REAL,
      total_price INTEGER,
      payment_method VARCHAR(20) DEFAULT 'shopee',
      midtrans_order_id VARCHAR(100),
      midtrans_transaction_id VARCHAR(100),
      payment_status VARCHAR(20) DEFAULT 'pending',
      email VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS order_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      image_path VARCHAR(500) NOT NULL,
      image_type VARCHAR(50),
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      old_status VARCHAR(50),
      new_status VARCHAR(50),
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      changed_by VARCHAR(100)
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      image_path VARCHAR(500),
      visible BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id),
      amount INTEGER,
      type VARCHAR(20) DEFAULT 'income',
      description TEXT,
      date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      address TEXT,
      province VARCHAR(100),
      city VARCHAR(100),
      postal_code VARCHAR(10),
      verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS client_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      token VARCHAR(64) UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(20) DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER REFERENCES chat_conversations(id) ON DELETE CASCADE,
      sender_type VARCHAR(10) NOT NULL,
      sender_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      file_path VARCHAR(500),
      file_name VARCHAR(255),
      file_type VARCHAR(50),
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material VARCHAR(20) NOT NULL,
      layer_height VARCHAR(10) NOT NULL,
      price_per_gram INTEGER NOT NULL,
      UNIQUE(material, layer_height)
    );
  `);

  // Seed default pricing
  const priceCount = await get('SELECT COUNT(*) as c FROM prices');
  if (!priceCount || priceCount.c === 0) {
    const defaultPrices = [
      ['PLA',  '0.08', 699], ['PLA',  '0.10', 499], ['PLA',  '0.12', 449],
      ['PLA',  '0.15', 399], ['PLA',  '0.20', 349], ['PLA',  '0.22', 299],
      ['PETG', '0.08', 799], ['PETG', '0.10', 660], ['PETG', '0.12', 590],
      ['PETG', '0.15', 540], ['PETG', '0.20', 490], ['PETG', '0.22', 360],
    ];
    for (const [m, lh, p] of defaultPrices) {
      await run('INSERT OR IGNORE INTO prices (material, layer_height, price_per_gram) VALUES (?, ?, ?)', [m, lh, p]);
    }
  }

  console.log('✅ Database initialized');
}

module.exports = { getDb, all, get, run, runSync, initDB };
