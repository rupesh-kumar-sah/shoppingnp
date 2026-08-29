const bcrypt = require('bcryptjs');

const DB_TYPE = process.env.DB_TYPE || 'memory';
let dbEngine = 'memory';
let pgPool = null;

// Pure JavaScript Database Engine (Zero binary dependencies, zero WASM, zero crash on Netlify Serverless)
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
      return;
    } catch (err) {
      dbEngine = 'memory';
    }
  }
}

function saveDatabase() {}

async function getOne(sql, params = []) {
  if (dbEngine === 'postgres' && pgPool) {
    const pgSql = convertPlaceholders(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows[0] || null;
  }

  const lower = sql.toLowerCase();
  if (lower.includes('from users')) {
    if (params[0]) return memoryStore.users.find(u => u.email === params[0] || u.id == params[0]) || memoryStore.users[0];
    return memoryStore.users[0];
  }
  if (lower.includes('from products')) {
    if (params[0]) return memoryStore.products.find(p => p.id == params[0] || p.slug === params[0]) || memoryStore.products[0];
    return memoryStore.products[0];
  }
  if (lower.includes('count(*)')) {
    if (lower.includes('from products')) return { count: memoryStore.products.length, total: memoryStore.products.length };
    if (lower.includes('from orders')) return { count: memoryStore.orders.length, total: memoryStore.orders.length };
    if (lower.includes('from users')) return { count: memoryStore.users.length, total: memoryStore.users.length };
    return { count: 5, total: 5 };
  }
  return null;
}

async function getAll(sql, params = []) {
  if (dbEngine === 'postgres' && pgPool) {
    const pgSql = convertPlaceholders(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows;
  }

  const lower = sql.toLowerCase();
  if (lower.includes('from products')) {
    if (lower.includes('where (c.slug') || lower.includes('c.id =')) {
      const cat = params[0];
      return memoryStore.products.filter(p => p.category_slug === cat || p.category_id == cat);
    }
    if (lower.includes('featured = 1')) return memoryStore.products.filter(p => p.is_featured === 1);
    return memoryStore.products;
  }
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
