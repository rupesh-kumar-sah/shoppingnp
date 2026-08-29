const express = require('express');
const { getOne, getAll, runSql } = require('../models/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const items = await getAll(`SELECT w.id, w.created_at, p.id as product_id, p.name, p.price, p.compare_price, p.image, p.slug, p.rating, p.stock, c.name as category_name FROM wishlist w JOIN products p ON w.product_id = p.id LEFT JOIN categories c ON p.category_id = c.id WHERE w.user_id = ? AND p.is_active = 1 ORDER BY w.created_at DESC`, [req.user.id]);
    res.json({ items });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch wishlist.' }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { product_id } = req.body;
    const product = await getOne('SELECT id FROM products WHERE id = ? AND is_active = 1', [product_id]);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    const existing = await getOne('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]);
    if (existing) return res.status(400).json({ error: 'Already in wishlist.' });
    await runSql('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [req.user.id, product_id]);
    res.status(201).json({ message: 'Added to wishlist.' });
  } catch (err) { res.status(500).json({ error: 'Failed to add to wishlist.' }); }
});

router.delete('/:product_id', authenticate, async (req, res) => {
  try {
    await runSql('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, req.params.product_id]);
    res.json({ message: 'Removed from wishlist.' });
  } catch (err) { res.status(500).json({ error: 'Failed to remove from wishlist.' }); }
});

module.exports = router;
