const express = require('express');
const { getOne, getAll, runSql } = require('../models/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, search, sort, page = 1, limit = 12, featured, min_price, max_price, brand } = req.query;
    const offset = (page - 1) * limit;
    let where = ['p.is_active = 1'];
    let params = [];

    if (category) { where.push('(c.slug = ? OR c.id = ?)'); params.push(category, category); }
    if (search) { where.push('(p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (featured === 'true') { where.push('p.is_featured = 1'); }
    if (min_price) { where.push('p.price >= ?'); params.push(parseFloat(min_price)); }
    if (max_price) { where.push('p.price <= ?'); params.push(parseFloat(max_price)); }
    if (brand) { where.push('p.brand = ?'); params.push(brand); }

    let orderBy = 'p.created_at DESC';
    if (sort === 'price_asc') orderBy = 'p.price ASC';
    else if (sort === 'price_desc') orderBy = 'p.price DESC';
    else if (sort === 'rating') orderBy = 'p.rating DESC';
    else if (sort === 'name') orderBy = 'p.name ASC';
    else if (sort === 'newest') orderBy = 'p.created_at DESC';
    else if (sort === 'popular') orderBy = 'p.num_reviews DESC';

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const countResult = await getOne(`SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id ${whereClause}`, params);
    const products = await getAll(`SELECT p.*, c.name as category_name, c.slug as category_slug, u.name as seller_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN users u ON p.seller_id = u.id ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...params, parseInt(limit), parseInt(offset)]);

    res.json({ products, pagination: { total: countResult.total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(countResult.total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products: ' + err.message });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await getOne(`SELECT p.*, c.name as category_name, c.slug as category_slug, u.name as seller_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN users u ON p.seller_id = u.id WHERE (p.id = ? OR p.slug = ?) AND p.is_active = 1`, [id, id]);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const reviews = await getAll(`SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = ? AND r.is_approved = 1 ORDER BY r.created_at DESC`, [product.id]);
    const related = await getAll(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1 ORDER BY RANDOM() LIMIT 4`, [product.category_id, product.id]);

    res.json({ product, reviews, related });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product: ' + err.message });
  }
});

router.post('/', authenticate, authorize('admin', 'seller'), async (req, res) => {
  try {
    const { name, category_id, description, price, compare_price, stock, sku, image, images, brand, is_featured } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price are required.' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
    const result = await runSql(`INSERT INTO products (seller_id, category_id, name, slug, description, price, compare_price, stock, sku, image, images, brand, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.role === 'admin' ? null : req.user.id, category_id || null, name, slug, description || '', price, compare_price || null, stock || 0, sku || null, image || null, images ? JSON.stringify(images) : null, brand || null, is_featured ? 1 : 0]);

    const product = await getOne('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Product created.', product });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product: ' + err.message });
  }
});

router.put('/:id', authenticate, authorize('admin', 'seller'), async (req, res) => {
  try {
    const product = await getOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (req.user.role === 'seller' && product.seller_id !== req.user.id) return res.status(403).json({ error: 'Not your product.' });

    const { name, category_id, description, price, compare_price, stock, sku, image, images, brand, is_featured, is_active } = req.body;

    await runSql(`UPDATE products SET name = ?, category_id = ?, description = ?, price = ?, compare_price = ?, stock = ?, sku = ?, image = ?, images = ?, brand = ?, is_featured = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name || product.name, category_id !== undefined ? category_id : product.category_id, description !== undefined ? description : product.description,
       price !== undefined ? price : product.price, compare_price !== undefined ? compare_price : product.compare_price,
       stock !== undefined ? stock : product.stock, sku !== undefined ? sku : product.sku, image || product.image,
       images ? JSON.stringify(images) : product.images, brand !== undefined ? brand : product.brand,
       is_featured !== undefined ? (is_featured ? 1 : 0) : product.is_featured,
       is_active !== undefined ? (is_active ? 1 : 0) : product.is_active, req.params.id]);

    const updated = await getOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product updated.', product: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product: ' + err.message });
  }
});

router.delete('/:id', authenticate, authorize('admin', 'seller'), async (req, res) => {
  try {
    const product = await getOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (req.user.role === 'seller' && product.seller_id !== req.user.id) return res.status(403).json({ error: 'Not your product.' });

    await runSql('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product: ' + err.message });
  }
});

router.post('/:id/reviews', authenticate, async (req, res) => {
  try {
    const { rating, title, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5.' });

    const product = await getOne('SELECT id FROM products WHERE id = ? AND is_active = 1', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const existing = await getOne('SELECT id FROM reviews WHERE product_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (existing) return res.status(400).json({ error: 'You already reviewed this product.' });

    await runSql('INSERT INTO reviews (product_id, user_id, rating, title, comment, is_approved) VALUES (?, ?, ?, ?, ?, 1)', [req.params.id, req.user.id, rating, title || '', comment || '']);

    const stats = await getOne('SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE product_id = ? AND is_approved = 1', [req.params.id]);
    await runSql('UPDATE products SET rating = ?, num_reviews = ? WHERE id = ?', [Math.round(stats.avg_rating * 10) / 10, stats.count, req.params.id]);

    res.status(201).json({ message: 'Review added.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add review: ' + err.message });
  }
});

module.exports = router;
