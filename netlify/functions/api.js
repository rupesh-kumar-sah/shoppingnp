const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('../../backend/src/models/database');

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

let isDbInitialized = false;

app.use(async (req, res, next) => {
  try {
    if (!isDbInitialized) {
      await initializeDatabase();
      isDbInitialized = true;
    }
    next();
  } catch (err) {
    console.error('Database Init Error:', err);
    res.status(500).json({ error: 'Database connection failed: ' + err.message });
  }
});

app.use('/.netlify/functions/api/auth', require('../../backend/src/routes/auth'));
app.use('/.netlify/functions/api/products', require('../../backend/src/routes/products'));
app.use('/.netlify/functions/api/categories', require('../../backend/src/routes/categories'));
app.use('/.netlify/functions/api/cart', require('../../backend/src/routes/cart'));
app.use('/.netlify/functions/api/orders', require('../../backend/src/routes/orders'));
app.use('/.netlify/functions/api/wishlist', require('../../backend/src/routes/wishlist'));
app.use('/.netlify/functions/api/admin', require('../../backend/src/routes/admin'));

app.use('/api/auth', require('../../backend/src/routes/auth'));
app.use('/api/products', require('../../backend/src/routes/products'));
app.use('/api/categories', require('../../backend/src/routes/categories'));
app.use('/api/cart', require('../../backend/src/routes/cart'));
app.use('/api/orders', require('../../backend/src/routes/orders'));
app.use('/api/wishlist', require('../../backend/src/routes/wishlist'));
app.use('/api/admin', require('../../backend/src/routes/admin'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', environment: 'netlify-serverless' }));
app.get('/.netlify/functions/api/health', (req, res) => res.json({ status: 'OK', environment: 'netlify-serverless' }));

module.exports.handler = serverless(app);
