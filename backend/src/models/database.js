const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_TYPE = process.env.DB_TYPE || 'sqlite';
const DB_PATH = path.join('/tmp', 'ecommerce.db');

let dbEngine = 'sqlite';
let sqliteDb = null;
let pgPool = null;

function convertPlaceholders(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

async function initializeDatabase() {
  if (sqliteDb || pgPool) return;

  if (DB_TYPE === 'postgres' && (process.env.PGHOST || process.env.DATABASE_URL)) {
    try {
      const { Pool } = require('pg');
      pgPool = new Pool(
        process.env.DATABASE_URL
          ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
          : {
              host: process.env.PGHOST,
              port: parseInt(process.env.PGPORT || '5432'),
              user: process.env.PGUSER,
              password: process.env.PGPASSWORD,
              database: process.env.PGDATABASE,
              connectionTimeoutMillis: 3000
            }
      );

      await pgPool.query('SELECT 1');
      dbEngine = 'postgres';
      console.log(' Connected to PostgreSQL database');

      const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'schema.sql'), 'utf8');
      await pgPool.query(schema);

      const adminRes = await pgPool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
      if (adminRes.rows.length === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        await pgPool.query(
          "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
          ['Admin User', 'admin@ecommerce.com', hashedPassword, 'admin']
        );
      }
      return;
    } catch (err) {
      console.log(`PostgreSQL connection notice (${err.message}). Using SQLite mode.`);
      dbEngine = 'sqlite';
    }
  }

  // SQLite mode (works in-memory & in serverless environment)
  const wasmPath = path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  const locateFile = () => fs.existsSync(wasmPath) ? wasmPath : undefined;

  const SQL = await initSqlJs({ locateFile });
  sqliteDb = new SQL.Database();
  dbEngine = 'sqlite';

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
      FOREIGN KEY (user_id) REFERENCES orders(id) ON DELETE CASCADE
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

  // Seed default admin & categories & products into memory
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  sqliteDb.run("INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
    ['Admin User', 'admin@ecommerce.com', hashedPassword, 'admin']);

  const custPassword = bcrypt.hashSync('password123', 10);
  sqliteDb.run("INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
    ['John Customer', 'john@test.com', custPassword, 'customer']);

  // Categories
  sqliteDb.run("INSERT OR IGNORE INTO categories (id, name, slug, description, image) VALUES (1, 'Electronics', 'electronics', 'Smartphones, laptops', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400')");
  sqliteDb.run("INSERT OR IGNORE INTO categories (id, name, slug, description, image) VALUES (2, 'Fashion', 'fashion', 'Clothing and shoes', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400')");
  sqliteDb.run("INSERT OR IGNORE INTO categories (id, name, slug, description, image) VALUES (3, 'Home & Living', 'home-living', 'Furniture & decor', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400')");

  // Sample products
  sqliteDb.run(`INSERT OR IGNORE INTO products (id, name, slug, category_id, price, compare_price, stock, brand, description, image, is_featured, rating, num_reviews)
    VALUES (1, 'Premium Wireless Headphones', 'premium-wireless-headphones', 1, 89.99, 129.99, 50, 'SoundMax', 'High-quality wireless headphones', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', 1, 4.5, 128)`);
  sqliteDb.run(`INSERT OR IGNORE INTO products (id, name, slug, category_id, price, compare_price, stock, brand, description, image, is_featured, rating, num_reviews)
    VALUES (2, 'Smartphone Pro Max 15', 'smartphone-pro-max-15', 1, 999.99, 1199.99, 30, 'TechVision', 'Flagship smartphone', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 1, 4.7, 256)`);
  sqliteDb.run(`INSERT OR IGNORE INTO products (id, name, slug, category_id, price, compare_price, stock, brand, description, image, is_featured, rating, num_reviews)
    VALUES (3, 'Classic Leather Jacket', 'classic-leather-jacket', 2, 149.99, 199.99, 35, 'UrbanStyle', 'Genuine leather jacket', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', 1, 4.6, 56)`);
  sqliteDb.run(`INSERT OR IGNORE INTO products (id, name, slug, category_id, price, compare_price, stock, brand, description, image, is_featured, rating, num_reviews)
    VALUES (4, 'Running Shoes Air Max', 'running-shoes-air-max', 2, 119.99, 149.99, 45, 'SpeedFit', 'Cushioned running shoes', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', 1, 4.4, 92)`);

  saveDatabase();
}

function saveDatabase() {
  if (dbEngine === 'sqlite' && sqliteDb) {
    try {
      const data = sqliteDb.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch {}
  }
}

async function getOne(sql, params = []) {
  if (dbEngine === 'postgres' && pgPool) {
    const pgSql = convertPlaceholders(sql);
    const res = await pgPool.query(pgSql, params);
    if (res.rows[0]) {
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
  if (dbEngine === 'postgres' && pgPool) {
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
  if (dbEngine === 'postgres' && pgPool) {
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
