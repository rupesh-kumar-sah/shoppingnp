const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

let databaseModule;
try {
  databaseModule = require('./src/models/database');
} catch (e) {
  console.error('Failed loading database module:', e);
}

app.use(async (req, res, next) => {
  try {
    if (databaseModule && databaseModule.initializeDatabase) {
      await databaseModule.initializeDatabase();
    }
  } catch (err) {
    console.error('DB Init Error:', err);
  }
  next();
});

// Mount routes
const authRouter = require('./src/routes/auth');
const productsRouter = require('./src/routes/products');
const categoriesRouter = require('./src/routes/categories');
const cartRouter = require('./src/routes/cart');
const ordersRouter = require('./src/routes/orders');
const wishlistRouter = require('./src/routes/wishlist');
const adminRouter = require('./src/routes/admin');

app.use(['/api/auth', '/.netlify/functions/api/auth', '/auth'], authRouter);
app.use(['/api/products', '/.netlify/functions/api/products', '/products'], productsRouter);
app.use(['/api/categories', '/.netlify/functions/api/categories', '/categories'], categoriesRouter);
app.use(['/api/cart', '/.netlify/functions/api/cart', '/cart'], cartRouter);
app.use(['/api/orders', '/.netlify/functions/api/orders', '/orders'], ordersRouter);
app.use(['/api/wishlist', '/.netlify/functions/api/wishlist', '/wishlist'], wishlistRouter);
app.use(['/api/admin', '/.netlify/functions/api/admin', '/admin'], adminRouter);

app.get(['/api/health', '/.netlify/functions/api/health', '/health'], (req, res) => {
  res.json({ status: 'OK', message: 'Backend REST API connected & online' });
});

app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

module.exports.handler = serverless(app);
