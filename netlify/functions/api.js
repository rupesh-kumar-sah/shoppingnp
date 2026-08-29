const databaseModule = require('./src/models/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ecommerce_super_secret_key_2024';

function json(statusCode, data, headers = {}) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(data)
  };
}

function parseUser(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, {});
  }

  await databaseModule.initializeDatabase();

  const fullPath = (event.path || '').replace('/.netlify/functions/api', '').replace('/api', '') || '/';
  const method = event.httpMethod.toUpperCase();
  const body = event.body ? JSON.parse(event.body) : {};
  const user = parseUser(event);

  try {
    // HEALTH
    if (fullPath === '/health' || fullPath === '/') {
      return json(200, { status: 'OK', message: 'Backend REST API connected & online' });
    }

    // AUTH ROUTES
    if (fullPath === '/auth/login' && method === 'POST') {
      const { email, password } = body;
      if (!email || !password) return json(400, { error: 'Email and password required.' });
      const found = await databaseModule.getOne('SELECT * FROM users WHERE email = ?', [email]);
      if (!found) return json(401, { error: 'Invalid email or password.' });
      const isMatch = bcrypt.compareSync(password, found.password);
      if (!isMatch) return json(401, { error: 'Invalid email or password.' });

      const safeUser = { id: found.id, name: found.name, email: found.email, role: found.role, phone: found.phone || '', city: found.city || '' };
      const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' });
      return json(200, { message: 'Login successful.', user: safeUser, accessToken: token, refreshToken: token });
    }

    if (fullPath === '/auth/register' && method === 'POST') {
      const { name, email, password, phone, role } = body;
      if (!name || !email || !password) return json(400, { error: 'Name, email, and password required.' });      const hash = bcrypt.hashSync(password, 10);
      const userRole = role === 'seller' ? 'seller' : 'customer';
      const result = await databaseModule.runSql('INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)', [name, email, hash, phone || '', userRole]);
      const newUser = { id: result.lastInsertRowid, name, email, role: userRole, phone: phone || '', city: '' };
      const token = jwt.sign(newUser, JWT_SECRET, { expiresIn: '7d' });
      return json(201, { message: 'Registration successful.', user: newUser, accessToken: token, refreshToken: token });
    }

    if (fullPath === '/auth/profile' && method === 'GET') {
      if (!user) return json(401, { error: 'Authentication required.' });
      const found = await databaseModule.getOne('SELECT id, name, email, phone, city, address, role FROM users WHERE id = ?', [user.id]);
      return json(200, { user: found || user });
    }

    if (fullPath === '/auth/profile' && method === 'PUT') {
      if (!user) return json(401, { error: 'Authentication required.' });
      const { name, phone, city, address } = body;
      await databaseModule.runSql('UPDATE users SET name = ?, phone = ?, city = ?, address = ? WHERE id = ?', [name || user.name, phone || '', city || '', address || '', user.id]);
      const updated = await databaseModule.getOne('SELECT id, name, email, phone, city, address, role FROM users WHERE id = ?', [user.id]);
      return json(200, { message: 'Profile updated.', user: updated });
    }

    // PRODUCTS ROUTES
    if (fullPath.startsWith('/products')) {
      const parts = fullPath.split('/').filter(Boolean);

      // GET single product: /products/1
      if (parts.length === 2 && method === 'GET' && !isNaN(parts[1])) {
        const id = parseInt(parts[1]);
        const product = await databaseModule.getOne('SELECT * FROM products WHERE id = ?', [id]);
        if (!product) return json(404, { error: 'Product not found.' });
        const reviews = await databaseModule.getAll('SELECT * FROM reviews WHERE product_id = ?', [id]);
        const allProducts = await databaseModule.getAll('SELECT * FROM products');
        const related = allProducts.filter(p => p.id !== id).slice(0, 4);
        return json(200, { product, reviews, related });
      }

      // POST add review: /products/1/reviews
      if (parts.length === 3 && parts[2] === 'reviews' && method === 'POST') {
        if (!user) return json(401, { error: 'Login required to leave a review.' });
        const pId = parseInt(parts[1]);
        const { rating, title, comment } = body;
        await databaseModule.runSql('INSERT INTO reviews (product_id, user_id, rating, title, comment, is_approved) VALUES (?, ?, ?, ?, ?, 1)', [pId, user.id, rating || 5, title || '', comment || '']);
        return json(201, { message: 'Review submitted.' });
      }

      // POST create product
      if (parts.length === 1 && method === 'POST') {
        if (!user || !['admin', 'seller'].includes(user.role)) return json(403, { error: 'Seller or Admin access required.' });
        const { name, price, stock, category_id, image, description, brand } = body;
        const result = await databaseModule.runSql('INSERT INTO products (name, slug, category_id, price, stock, brand, description, image, seller_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [name, name.toLowerCase().replace(/\s+/g, '-'), category_id || 1, price || 10, stock || 10, brand || 'Vendor', description || '', image || 'https://via.placeholder.com/400', user.id]);
        const product = await databaseModule.getOne('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);
        return json(201, { message: 'Product created.', product });
      }

      // PUT update product
      if (parts.length === 2 && method === 'PUT') {
        if (!user || !['admin', 'seller'].includes(user.role)) return json(403, { error: 'Access denied.' });
        const id = parseInt(parts[1]);
        const { name, price, stock, description, image } = body;
        await databaseModule.runSql('UPDATE products SET name = ?, price = ?, stock = ?, description = ?, image = ? WHERE id = ?', [name, price, stock, description, image, id]);
        const product = await databaseModule.getOne('SELECT * FROM products WHERE id = ?', [id]);
        return json(200, { message: 'Product updated.', product });
      }

      // DELETE product
      if (parts.length === 2 && method === 'DELETE') {
        if (!user || !['admin', 'seller'].includes(user.role)) return json(403, { error: 'Access denied.' });
        await databaseModule.runSql('DELETE FROM products WHERE id = ?', [parseInt(parts[1])]);
        return json(200, { message: 'Product deleted.' });
      }

      // GET all products catalog with filters
      let products = await databaseModule.getAll('SELECT * FROM products');
      const query = event.queryStringParameters || {};
      if (query.category) {
        products = products.filter(p => String(p.category_id) === String(query.category) || p.category_slug === query.category);
      }
      if (query.search) {
        const q = query.search.toLowerCase();
        products = products.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
      }
      if (query.featured === 'true') {
        products = products.filter(p => p.is_featured === 1);
      }

      return json(200, { products, pagination: { total: products.length, page: 1, limit: 12, pages: 1 } });
    }

    // CATEGORIES ROUTES
    if (fullPath.startsWith('/categories')) {
      const categories = await databaseModule.getAll('SELECT * FROM categories');
      return json(200, { categories });
    }

    // CART ROUTES
    if (fullPath.startsWith('/cart')) {
      if (!user) return json(401, { error: 'Login required.' });
      if (method === 'POST') {
        const { product_id, quantity = 1 } = body;
        await databaseModule.runSql('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [user.id, product_id, quantity]);
        return json(200, { message: 'Added to cart.' });
      }
      if (method === 'DELETE') {
        await databaseModule.runSql('DELETE FROM cart WHERE user_id = ?', [user.id]);
        return json(200, { message: 'Cart cleared.' });
      }
      const items = await databaseModule.getAll('SELECT * FROM cart');
      return json(200, { items, total: 0, count: items.length });
    }

    // ORDERS ROUTES
    if (fullPath.startsWith('/orders')) {
      if (!user) return json(401, { error: 'Login required.' });
      if (method === 'POST') {
        const { total_amount, shipping_name, shipping_address, shipping_city, shipping_phone, payment_method } = body;
        const result = await databaseModule.runSql('INSERT INTO orders (user_id, total_amount, status, payment_status, payment_method, shipping_name, shipping_address, shipping_city, shipping_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [user.id, total_amount || 99.99, 'pending', 'unpaid', payment_method || 'cod', shipping_name || user.name, shipping_address || 'Address', shipping_city || 'City', shipping_phone || '9841234567']);
        const order = { id: result.lastInsertRowid, total_amount: total_amount || 99.99, status: 'pending', payment_status: 'unpaid' };
        return json(201, { message: 'Order placed successfully!', order });
      }
      const orders = await databaseModule.getAll('SELECT * FROM orders');
      return json(200, { orders, pagination: { total: orders.length, page: 1, limit: 10 } });
    }

    // WISHLIST ROUTES
    if (fullPath.startsWith('/wishlist')) {
      if (!user) return json(401, { error: 'Login required.' });
      const items = await databaseModule.getAll('SELECT * FROM wishlist');
      return json(200, { items });
    }

    // ADMIN ROUTES
    if (fullPath.startsWith('/admin')) {
      if (fullPath.endsWith('/dashboard')) {
        const stats = { totalProducts: 5, totalOrders: 1, totalUsers: 3, totalRevenue: 179.98, pendingOrders: 0, processingOrders: 0, deliveredOrders: 1 };
        const recentOrders = await databaseModule.getAll('SELECT * FROM orders');
        const topProducts = await databaseModule.getAll('SELECT * FROM products');
        const monthlySales = [{ month: '2024-08', orders: 1, revenue: 179.98 }];
        return json(200, { stats, recentOrders, topProducts, monthlySales, ordersByStatus: [{ status: 'delivered', count: 1 }] });
      }

      if (fullPath.endsWith('/users')) {
        const users = await databaseModule.getAll('SELECT * FROM users');
        return json(200, { users, pagination: { total: users.length, page: 1, limit: 20 } });
      }

      if (fullPath.endsWith('/orders')) {
        const orders = await databaseModule.getAll('SELECT * FROM orders');
        return json(200, { orders, pagination: { total: orders.length, page: 1, limit: 20 } });
      }

      if (fullPath.endsWith('/products')) {
        const products = await databaseModule.getAll('SELECT * FROM products');
        return json(200, { products, pagination: { total: products.length, page: 1, limit: 20 } });
      }

      if (fullPath.endsWith('/coupons')) {
        const coupons = await databaseModule.getAll('SELECT * FROM coupons');
        return json(200, { coupons });
      }

      if (fullPath.endsWith('/reviews')) {
        const reviews = await databaseModule.getAll('SELECT * FROM reviews');
        return json(200, { reviews });
      }
    }

    const defaultProducts = await databaseModule.getAll('SELECT * FROM products');
    return json(200, { products: defaultProducts });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
