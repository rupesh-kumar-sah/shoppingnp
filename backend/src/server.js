require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./models/database');

async function startServer() {
  await initializeDatabase();

  const app = express();

  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4000', 'http://localhost:4001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:4000', 'http://127.0.0.1:4001', 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/products', require('./routes/products'));
  app.use('/api/categories', require('./routes/categories'));
  app.use('/api/cart', require('./routes/cart'));
  app.use('/api/orders', require('./routes/orders'));
  app.use('/api/wishlist', require('./routes/wishlist'));
  app.use('/api/admin', require('./routes/admin'));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`\n🚀 E-Commerce API Server running on http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`\n✨ Ready!\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
