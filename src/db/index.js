/**
 * Database module that works in both local (better-sqlite3) and Vercel (in-memory fallback).
 *
 * On Vercel: better-sqlite3 won't load (native addon). We use a simple in-memory store
 * for read operations (EJS rendering) and async @libsql/client for write operations via api/.
 *
 * Usage:
 *   - For async (API routes): use require('../../api/db') — async methods (get, all, run)
 *   - For sync  (Express controllers): use this module — sync methods via better-sqlite3
 *
 * When better-sqlite3 fails (Vercel), falls back to inMemoryStore.
 */
let sqlite = null;
let Database;
let initDBFn;

const isVercel = process.env.VERCEL === 'true';

try {
  Database = require('better-sqlite3');
} catch {
  Database = null;
}

function createInMemoryStore() {
  const tables = {};
  return {
    prepare(sql) {
      return {
        get(...args) { return undefined; },
        all(...args) { return []; },
        run(...args) { return { lastInsertRowid: 0, rowsAffected: 0 }; },
      };
    },
    exec(sql) {},
    pragma() {},
    close() {},
  };
}

try {
  if (Database) {
    const dbPath = process.env.DB_PATH || './data/pegangind.db';
    sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
  } else {
    sqlite = createInMemoryStore();
  }
} catch {
  sqlite = createInMemoryStore();
}

// ---- Migration helpers (sync, for existing Express routes) ----
function safeExec(sql) {
  try { sqlite.exec(sql); } catch (_) {}
}

// Run a sync query and return first row
function syncGet(sql, params = []) {
  try {
    return sqlite.prepare(sql).get(...params);
  } catch {
    return null;
  }
}

// Run a sync query and return all rows
function syncAll(sql, params = []) {
  try {
    return sqlite.prepare(sql).all(...params);
  } catch {
    return [];
  }
}

// Run a sync insert/update/delete
function syncRun(sql, params = []) {
  try {
    return sqlite.prepare(sql).run(...params);
  } catch {
    return { lastInsertRowid: 0, rowsAffected: 0 };
  }
}

// Initialize database tables (called on server start)
const initDB = () => {
  // Add missing columns
  safeExec(`ALTER TABLE chat_messages ADD COLUMN file_path VARCHAR(500)`);
  safeExec(`ALTER TABLE chat_messages ADD COLUMN file_name VARCHAR(255)`);
  safeExec(`ALTER TABLE chat_messages ADD COLUMN file_type VARCHAR(50)`);

  const newOrderCols = [
    ['material_type', 'VARCHAR(20)'],
    ['layer_height', 'VARCHAR(10)'],
    ['gram_weight', 'REAL'],
    ['total_price', 'INTEGER'],
    ['payment_method', "VARCHAR(20) DEFAULT 'shopee'"],
    ['midtrans_order_id', 'VARCHAR(100)'],
    ['midtrans_transaction_id', 'VARCHAR(100)'],
    ['payment_status', "VARCHAR(20) DEFAULT 'pending'"],
    ['email', 'VARCHAR(255)'],
    ['address', 'TEXT'],
    ['province', 'VARCHAR(100)'],
    ['city', 'VARCHAR(100)'],
    ['postal_code', 'VARCHAR(10)'],
    ['client_id', 'INTEGER'],
  ];
  newOrderCols.forEach(([col, def]) => {
    safeExec(`ALTER TABLE orders ADD COLUMN ${col} ${def}`);
  });

  const clientProfileCols = [
    ['phone', 'VARCHAR(20)'],
    ['address', 'TEXT'],
    ['province', 'VARCHAR(100)'],
    ['city', 'VARCHAR(100)'],
    ['postal_code', 'VARCHAR(10)'],
    ['updated_at', 'DATETIME'],
  ];
  clientProfileCols.forEach(([col, def]) => {
    safeExec(`ALTER TABLE clients ADD COLUMN ${col} ${def}`);
  });

  const bcrypt = require('bcrypt');
  const crypto = require('crypto');

  const adminExists = syncGet('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    const hash = bcrypt.hashSync('pegangind2024', 10);
    syncRun('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
    console.log('✅ Admin user created: admin / pegangind2024');
  }

  const priceCount = syncGet('SELECT COUNT(*) as c FROM prices');
  if (!priceCount || priceCount.c === 0) {
    const defaultPrices = [
      ['PLA', '0.08', 699], ['PLA', '0.10', 499], ['PLA', '0.12', 449],
      ['PLA', '0.15', 399], ['PLA', '0.20', 349], ['PLA', '0.22', 299],
      ['PETG', '0.08', 799], ['PETG', '0.10', 660], ['PETG', '0.12', 590],
      ['PETG', '0.15', 540], ['PETG', '0.20', 490], ['PETG', '0.22', 360],
    ];
    defaultPrices.forEach(([m, lh, p]) => {
      syncRun('INSERT OR IGNORE INTO prices (material, layer_height, price_per_gram) VALUES (?, ?, ?)', [m, lh, p]);
    });
  }

  const orderCount = syncGet('SELECT COUNT(*) as count FROM orders');
  if (!orderCount || orderCount.count === 0) {
    seedData();
  }
};

const seedData = () => {
  const orders = [
    { order_id: 'PG-20260401-001', client_name: 'Budi Santoso', whatsapp: '08123456789', resi_shopee: 'SNWA1234567890', shopee_link: 'https://shopee.co.id/order/123', material: 'PLA+', filament_color: 'Merah', status: 'Sudah Dikirim', notes: 'Rex Figurine - detil tinggi', tracking_number: 'JNE123456' },
    { order_id: 'PG-20260402-001', client_name: 'Siti Rahayu', whatsapp: '08234567890', resi_shopee: 'SNWB9876543210', shopee_link: 'https://shopee.co.id/order/456', material: 'PETG', filament_color: 'Hitam', status: 'Sedang Dicetak', notes: 'Gear Set Prototype' },
    { order_id: 'PG-20260403-001', client_name: 'Ahmad Fauzi', whatsapp: '08345678901', resi_shopee: 'SNWC1122334455', shopee_link: 'https://shopee.co.id/order/789', material: 'PLA', filament_color: 'Biru', status: 'Pesanan Masuk', notes: 'Keychain Custom - logo perusahaan' },
  ];
  orders.forEach(order => {
    syncRun(
      `INSERT OR IGNORE INTO orders (order_id, client_name, whatsapp, resi_shopee, shopee_link, material, filament_color, status, notes, tracking_number)
       VALUES (@order_id, @client_name, @whatsapp, @resi_shopee, @shopee_link, @material, @filament_color, @status, @notes, @tracking_number)`,
      { tracking_number: null, ...order }
    );
  });

  const portfolioItems = [
    { title: 'Dragon Miniature', description: 'Miniatur naga detil tinggi dengan skala 1:10', category: 'figurine', visible: 1 },
    { title: 'Phone Stand Geometric', description: 'Phone stand dengan desain geometrik modern', category: 'household', visible: 1 },
    { title: 'Drone Frame v2', description: 'Frame drone racing custom material PETG', category: 'mechanical', visible: 1 },
    { title: 'Custom Keycap Set', description: 'Keycap custom dengan profile artisan', category: 'accessories', visible: 1 },
    { title: 'Architectural Model', description: 'Model arsitektur gedung skala 1:100', category: 'prototype', visible: 1 },
    { title: 'Robot Arm v3', description: 'Lengan robot 6-axis untuk proyek otomasi', category: 'mechanical', visible: 1 },
  ];
  portfolioItems.forEach(item => {
    syncRun('INSERT OR IGNORE INTO portfolio (title, description, category, visible) VALUES (@title, @description, @category, @visible)', item);
  });

  syncRun(`INSERT OR IGNORE INTO transactions (order_id, amount, type, description, date) VALUES (?, ?, 'income', ?, ?)`, [1, 450000, 'Rex Figurine - Budi Santoso', '2026-04-01']);
  console.log('✅ Seed data inserted');
};

const generateClientId = () => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[crypto.randomInt(chars.length)];
  }
  return `CLT-${yyyy}${mm}${dd}-${suffix}`;
};

module.exports = {
  get sqlite() { return sqlite; },
  initDB,
  generateClientId,
  // sync helpers
  syncGet,
  syncAll,
  syncRun,
};
