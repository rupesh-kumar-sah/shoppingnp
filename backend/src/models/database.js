const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_TYPE = process.env.DB_TYPE || 'sqlite';
const DB_PATH = path.join('/tmp', 'ecommerce.db');

let dbEngine = 'sqlite';
let sqliteDb = null;
let pgPool = null;

// Memory storage fallback if WASM/SQLite fails in serverless
let memoryStore = {
  users: [
    { id: 1, name: 'Admin User', email: 'admin@ecommerce.com', password: bcrypt.hashSync('admin123', 10), role: 'admin', is_active: 1, created_at: new Date().toISOString() },
    { id: 2, name: 'John Customer', email: 'john@test.com', password: bcrypt.hashSync('password123', 10), role: 'customer', is_active: 1, created_at: new Date().toISOString() },
    { id: 3, name: 'Seller One', email: 'seller@test.com', password: bcrypt.hashSync('password123', 10), role: 'seller', is_active: 1, created_at: new Date().toISOString() }
  ],
  categories: [
    { id: 1, name: 'Electronics', slug: 'electronics', description: 'Smartphones, laptops', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400', product_count: 2, is_active: 1 },
    { id: 2, name: 'Fashion', slug: 'fashion', description: 'Clothing and shoes', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400', product_count: 2, is_active: 1 },
    { id: 3, name: 'Home & Living', slug: 'home-living', description: 'Furniture & decor', image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400', product_count: 1, is_active: 1 },
    { id: 4, name: 'Sports & Outdoors', slug: 'sports-outdoors', description: 'Fitness gear', image: 'https://images.unsplash.com/photo-1461896836934-bd45ba8c69c6?w=400', product_count: 1, is_active: 1 }
  ],
  products: [
    { id: 1, seller_id: 3, category_id: 1, category_name: 'Electronics', category_slug: 'electronics', name: 'Premium Wireless Headphones', slug: 'premium-wireless-headphones', description: 'High-quality wireless headphones with active noise cancellation, 30-hour battery life.', price: 89.99, compare_price: 129.99, stock: 50, brand: 'SoundMax', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', is_featured: 1, rating: 4.5, num_reviews: 128, is_active: 1, created_at: new Date().toISOString() },
    { id: 2, seller_id: 3, category_id: 1, category_name: 'Electronics', category_slug: 'electronics', name: 'Smartphone Pro Max 15', slug: 'smartphone-pro-max-15', description: 'Latest flagship smartphone with 6.7 AMOLED display and 108MP camera.', price: 999.99, compare_price: 1199.99, stock: 30, brand: 'TechVision', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', is_featured: 1, rating: 4.7, num_reviews: 256, is_active: 1, created_at: new Date().toISOString() },
    { id: 3, seller_id: 3, category_id: 2, category_name: 'Fashion', category_slug: 'fashion', name: 'Classic Leather Jacket', slug: 'classic-leather-jacket', description: 'Premium genuine leather jacket.', price: 149.99, compare_price: 199.99, stock: 35, brand: 'UrbanStyle', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', is_featured: 1, rating: 4.6, num_reviews: 56, is_active: 1, created_at: new Date().toISOString() },
    { id: 4, seller_id: 3, category_id: 2, category_name: 'Fashion', category_slug: 'fashion', name: 'Running Shoes Air Max', slug: 'running-shoes-air-max', description: 'Lightweight running shoes with cushioned sole.', price: 119.99, compare_price: 149.99, stock: 45, brand: 'SpeedFit', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', is_featured: 1, rating: 4.4, num_reviews: 92, is_active: 1, created_at: new Date().toISOString() },
    { id: 5, seller_id: 3, category_id: 3, category_name: 'Home & Living', category_slug: 'home-living', name: 'Modern LED Desk Lamp', slug: 'modern-led-desk-lamp', description: 'Adjustable LED desk lamp with touch control.', price: 45.99, compare_price: 59.99, stock: 80, brand: 'LightPro', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=500', is_featured: 0, rating: 4.2, num_reviews: 38, is_active: 1, created_at: new Date().toISOString() }
  ],
  orders: [
    { id: 1, user_id: 2, customer_name: 'John Customer', total_amount: 179.98, status: 'delivered', payment_status: 'paid', payment_method: 'esewa', shipping_name: 'John Customer', shipping_address: '123 Main St', shipping_city: 'Kathmandu', shipping_phone: '9841234567', created_at: new Date().toISOString() }
  ],
  order_items: [
    { id: 1, order_id: 1, product_id: 1, quantity: 2, price: 89.99, total: 179.98, name: 'Premium Wireless Headphones', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500' }
  ],
  cart: [],
  wishlist: [],
  reviews: [
    { id: 1, product_id: 1, user_id: 2, user_name: 'John Customer', rating: 5, title: 'Amazing Sound!', comment: 'Best headphones I ever owned.', is_approved: 1, created_at: new Date().toISOString() }
  ],
  coupons: [
    { id: 1, code: 'WELCOME10', description: 'Welcome discount - 10% off', discount_type: 'percentage', discount_value: 10, min_order_amount: 20, is_active: 1 }
  ]
};

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
      return;
    } catch (err) {
      console.log(`PostgreSQL connection notice (${err.message}). Using SQLite/Memory mode.`);
      dbEngine = 'sqlite';
    }
  }

  try {
    const wasmPath = path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
    const locateFile = () => fs.existsSync(wasmPath) ? wasmPath : undefined;

    const SQL = await initSqlJs({ locateFile });
    sqliteDb = new SQL.Database();
    dbEngine = 'sqlite';

    sqliteDb.run('PRAGMA foreign_keys = ON');

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, phone TEXT, address TEXT, city TEXT, avatar TEXT, role TEXT NOT NULL DEFAULT 'customer', is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, image TEXT, parent_id INTEGER, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, seller_id INTEGER, category_id INTEGER, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, price REAL NOT NULL, compare_price REAL, stock INTEGER DEFAULT 0, sku TEXT, image TEXT, images TEXT, brand TEXT, rating REAL DEFAULT 0, num_reviews INTEGER DEFAULT 0, is_featured INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, total_amount REAL NOT NULL, shipping_amount REAL DEFAULT 0, tax_amount REAL DEFAULT 0, discount_amount REAL DEFAULT 0, status TEXT DEFAULT 'pending', payment_status TEXT DEFAULT 'unpaid', payment_method TEXT, shipping_name TEXT, shipping_address TEXT, shipping_city TEXT, shipping_phone TEXT, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL, price REAL NOT NULL, total REAL NOT NULL)`);
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, method TEXT NOT NULL, amount REAL NOT NULL, status TEXT DEFAULT 'pending', transaction_id TEXT, payment_data TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, user_id INTEGER NOT NULL, rating INTEGER NOT NULL, title TEXT, comment TEXT, is_approved INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS coupons (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, description TEXT, discount_type TEXT NOT NULL, discount_value REAL NOT NULL, min_order_amount REAL DEFAULT 0, max_uses INTEGER, used_count INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, expires_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS wishlist (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, product_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS cart (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

    // Seed users
    for (const u of memoryStore.users) {
      sqliteDb.run("INSERT OR IGNORE INTO users (id, name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)", [u.id, u.name, u.email, u.password, u.role, u.is_active]);
    }
    // Seed categories
    for (const c of memoryStore.categories) {
      sqliteDb.run("INSERT OR IGNORE INTO categories (id, name, slug, description, image) VALUES (?, ?, ?, ?, ?)", [c.id, c.name, c.slug, c.description, c.image]);
    }
    // Seed products
    for (const p of memoryStore.products) {
      sqliteDb.run("INSERT OR IGNORE INTO products (id, name, slug, category_id, price, compare_price, stock, brand, description, image, is_featured, rating, num_reviews) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [p.id, p.name, p.slug, p.category_id, p.price, p.compare_price, p.stock, p.brand, p.description, p.image, p.is_featured, p.rating, p.num_reviews]);
    }
    // Seed orders
    for (const o of memoryStore.orders) {
      sqliteDb.run("INSERT OR IGNORE INTO orders (id, user_id, total_amount, status, payment_status, payment_method, shipping_name, shipping_address, shipping_city, shipping_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [o.id, o.user_id, o.total_amount, o.status, o.payment_status, o.payment_method, o.shipping_name, o.shipping_address, o.shipping_city, o.shipping_phone]);
    }
    for (const oi of memoryStore.order_items) {
      sqliteDb.run("INSERT OR IGNORE INTO order_items (id, order_id, product_id, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)",
        [oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price, oi.total]);
    }
    for (const r of memoryStore.reviews) {
      sqliteDb.run("INSERT OR IGNORE INTO reviews (id, product_id, user_id, rating, title, comment, is_approved) VALUES (?, ?, ?, ?, ?, ?, 1)",
        [r.id, r.product_id, r.user_id, r.rating, r.title, r.comment]);
    }
    for (const cp of memoryStore.coupons) {
      sqliteDb.run("INSERT OR IGNORE INTO coupons (id, code, description, discount_type, discount_value, min_order_amount) VALUES (?, ?, ?, ?, ?, ?)",
        [cp.id, cp.code, cp.description, cp.discount_type, cp.discount_value, cp.min_order_amount]);
    }

    console.log('📦 SQLite database initialized in memory');
  } catch (e) {
    console.log('Using in-memory store mode:', e.message);
    dbEngine = 'memory';
  }
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
    return res.rows[0] || null;
  }

  if (dbEngine === 'sqlite' && sqliteDb) {
    try {
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
    } catch {}
  }

  // Memory fallback
  const lower = sql.toLowerCase();
  if (lower.includes('from users')) {
    if (params[0]) return memoryStore.users.find(u => u.email === params[0] || u.id == params[0]) || null;
    return memoryStore.users[0] || null;
  }
  if (lower.includes('from products')) {
    if (params[0]) return memoryStore.products.find(p => p.id == params[0] || p.slug === params[0]) || null;
    return memoryStore.products[0] || null;
  }
  if (lower.includes('count(*)')) return { count: 5, total: 5 };
  return null;
}

async function getAll(sql, params = []) {
  if (dbEngine === 'postgres' && pgPool) {
    const pgSql = convertPlaceholders(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows;
  }

  if (dbEngine === 'sqlite' && sqliteDb) {
    try {
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
    } catch {}
  }

  // Memory fallback
  const lower = sql.toLowerCase();
  if (lower.includes('from products')) return memoryStore.products;
  if (lower.includes('from categories')) return memoryStore.categories;
  if (lower.includes('from orders')) return memoryStore.orders;
  if (lower.includes('from users')) return memoryStore.users;
  if (lower.includes('from reviews')) return memoryStore.reviews;
  if (lower.includes('from coupons')) return memoryStore.coupons;
  if (lower.includes('from order_items')) return memoryStore.order_items;
  return [];
}

async function runSql(sql, params = []) {
  if (dbEngine === 'postgres' && pgPool) {
    let pgSql = convertPlaceholders(sql);
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql += ' RETURNING id';
    }
    const res = await pgPool.query(pgSql, params);
    return { lastInsertRowid: res.rows[0]?.id || 1, changes: res.rowCount };
  }

  if (dbEngine === 'sqlite' && sqliteDb) {
    try {
      sqliteDb.run(sql, params);
      const lastId = sqliteDb.exec("SELECT last_insert_rowid()");
      const changes = sqliteDb.exec("SELECT changes()");
      saveDatabase();
      return { lastInsertRowid: lastId[0]?.values[0]?.[0] || 1, changes: changes[0]?.values[0]?.[0] || 1 };
    } catch {}
  }

  // Memory fallback
  const lower = sql.toLowerCase();
  if (lower.startsWith('insert into products')) {
    const id = memoryStore.products.length + 1;
    memoryStore.products.push({ id, name: params[0] || 'New Product', price: params[1] || 99, stock: 10, is_active: 1, created_at: new Date().toISOString() });
    return { lastInsertRowid: id, changes: 1 };
  }
  if (lower.startsWith('insert into orders')) {
    const id = memoryStore.orders.length + 1;
    memoryStore.orders.push({ id, user_id: params[0] || 2, total_amount: params[1] || 100, status: 'pending', payment_status: 'unpaid', created_at: new Date().toISOString() });
    return { lastInsertRowid: id, changes: 1 };
  }
  return { lastInsertRowid: 1, changes: 1 };
}

module.exports = { initializeDatabase, getOne, getAll, runSql, saveDatabase };
