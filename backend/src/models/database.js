const initSqlJs = require('sql.js');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_TYPE = process.env.DB_TYPE || 'sqlite';
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'ecommerce.db');
const dataDir = path.dirname(DB_PATH);

let dbEngine = 'sqlite';
let sqliteDb = null;
let pgPool = null;

function convertPlaceholders(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

async function initializeDatabase() {
  if (DB_TYPE === 'postgres') {
    try {
      pgPool = new Pool({
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432'),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'ecommercedb',
        connectionTimeoutMillis: 3000
      });

      // Test connection
      await pgPool.query('SELECT 1');
      dbEngine = 'postgres';
      console.log(`\n🐘 Connected to local PostgreSQL database (${process.env.PGDATABASE || 'ecommercedb'})`);

      // Run schema
      const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'schema.sql'), 'utf8');
      await pgPool.query(schema);

      // Admin check
      const adminRes = await pgPool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
      if (adminRes.rows.length === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        await pgPool.query(
          "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
          ['Admin User', 'admin@ecommerce.com', hashedPassword, 'admin']
        );
        console.log('✅ Default admin created in PostgreSQL: admin@ecommerce.com / admin123');
      }
      return;
    } catch (err) {
      console.log(`\n⚠️ Local PostgreSQL not available (${err.message}). Falling back to SQLite...`);
      dbEngine = 'sqlite';
    }
  }

  // SQLite fallback
  const SQL = await initSqlJs();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqliteDb = new SQL.Database(fileBuffer);
  } else {
    sqliteDb = new SQL.Database();
  }

  sqliteDb.run('PRAGMA foreign_keys = ON');

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
      phone TEXT, address TEXT, city TEXT, avatar TEXT,
      role TEXT NOT NULL DEFAULT 'customer', is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, image TEXT,
      parent_id INTEGER, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER, category_id INTEGER, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
      description TEXT, price REAL NOT NULL, compare_price REAL, stock INTEGER DEFAULT 0,
      sku TEXT, image TEXT, images TEXT, brand TEXT, rating REAL DEFAULT 0, num_reviews INTEGER DEFAULT 0,
      is_featured INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL, total_amount REAL NOT NULL, shipping_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0, discount_amount REAL DEFAULT 0, status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'unpaid', payment_method TEXT, shipping_name TEXT,
      shipping_address TEXT, shipping_city TEXT, shipping_phone TEXT, notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL,
      price REAL NOT NULL, total REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL, method TEXT NOT NULL, amount REAL NOT NULL,
      status TEXT DEFAULT 'pending', transaction_id TEXT, payment_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL, user_id INTEGER NOT NULL, rating INTEGER NOT NULL,
      title TEXT, comment TEXT, is_approved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL, description TEXT, discount_type TEXT NOT NULL,
      discount_value REAL NOT NULL, min_order_amount REAL DEFAULT 0, max_uses INTEGER,
      used_count INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  const adminCheck = sqliteDb.exec("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (adminCheck.length === 0 || adminCheck[0].values.length === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    sqliteDb.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      ['Admin User', 'admin@ecommerce.com', hashedPassword, 'admin']);
  }

  saveDatabase();
  console.log('📦 Using SQLite Database engine');
}

function saveDatabase() {
  if (dbEngine === 'sqlite' && sqliteDb) {
    const data = sqliteDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

async function getOne(sql, params = []) {
  if (dbEngine === 'postgres') {
    const pgSql = convertPlaceholders(sql);
    const res = await pgPool.query(pgSql, params);
    if (res.rows[0]) {
      // Cast numeric types for consistency
      const row = res.rows[0];
      for (const k in row) {
        if (typeof row[k] === 'string' && !isNaN(row[k]) && row[k].trim() !== '' && !row[k].includes('-')) {
          const num = parseFloat(row[k]);
          if (!isNaN(num)) row[k] = num;
        }
      }
      return row;
    }
    return null;
  }

  const stmt = sqliteDb.prepare(sql);
  if (params.length) stmt.bind(params);
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    stmt.free();
    const row = {};
    cols.forEach((c, i) => row[c] = vals[i]);
    return row;
  }
  stmt.free();
  return null;
}

async function getAll(sql, params = []) {
  if (dbEngine === 'postgres') {
    const pgSql = convertPlaceholders(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows.map(row => {
      for (const k in row) {
        if (typeof row[k] === 'string' && !isNaN(row[k]) && row[k].trim() !== '' && !row[k].includes('-')) {
          const num = parseFloat(row[k]);
          if (!isNaN(num)) row[k] = num;
        }
      }
      return row;
    });
  }

  const stmt = sqliteDb.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  const cols = stmt.getColumnNames();
  while (stmt.step()) {
    const vals = stmt.get();
    const row = {};
    cols.forEach((c, i) => row[c] = vals[i]);
    results.push(row);
  }
  stmt.free();
  return results;
}

async function runSql(sql, params = []) {
  if (dbEngine === 'postgres') {
    let pgSql = convertPlaceholders(sql);
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql += ' RETURNING id';
    }
    const res = await pgPool.query(pgSql, params);
    return {
      lastInsertRowid: res.rows[0]?.id || 0,
      changes: res.rowCount
    };
  }

  sqliteDb.run(sql, params);
  const lastId = sqliteDb.exec("SELECT last_insert_rowid()");
  const changes = sqliteDb.exec("SELECT changes()");
  saveDatabase();
  return {
    lastInsertRowid: lastId[0]?.values[0]?.[0] || 0,
    changes: changes[0]?.values[0]?.[0] || 0
  };
}

module.exports = { initializeDatabase, getOne, getAll, runSql, saveDatabase };
