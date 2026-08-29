const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('../src/models/database');

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

let isDbInitialized = false;

app.use(async (req, res, next) => {
  if (!isDbInitialized) {
    await initializeDatabase();
    isDbInitialized = true;
  }
  next();
});

app.use('/.netlify/functions/api/auth', require('../src/routes/auth'));
app.use('/.netlify/functions/api/products', require('../src/routes/products'));
app.use('/.netlify/functions/api/categories', require('../src/routes/categories'));
app.use('/.netlify/functions/api/cart', require('../src/routes/cart'));
app.use('/.netlify/functions/api/orders', require('../src/routes/orders'));
app.use('/.netlify/functions/api/wishlist', require('../src/routes/wishlist'));
app.use('/.netlify/functions/api/admin', require('../src/routes/admin'));

// Fallback matching standard /api/ paths
app.use('/api/auth', require('../src/routes/auth'));
app.use('/api/products', require('../src/routes/products'));
app.use('/api/categories', require('../src/routes/categories'));
app.use('/api/cart', require('../src/routes/cart'));
app.use('/api/orders', require('../src/routes/orders'));
app.use('/api/wishlist', require('../src/routes/wishlist'));
app.use('/api/admin', require('../src/routes/admin'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', environment: 'netlify-serverless' }));

module.exports.handler = serverless(app);
