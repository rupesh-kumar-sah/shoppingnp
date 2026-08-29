const express = require('express');
const { getOne, getAll, runSql } = require('../models/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const items = await getAll(`SELECT c.id, c.quantity, p.id as product_id, p.name, p.price, p.compare_price, p.image, p.stock, p.slug, cat.name as category_name FROM cart c JOIN products p ON c.product_id = p.id LEFT JOIN categories cat ON p.category_id = cat.id WHERE c.user_id = ? AND p.is_active = 1`, [req.user.id]);
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    res.json({ items, total: Math.round(total * 100) / 100, count: items.length });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch cart.' }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    if (!product_id) return res.status(400).json({ error: 'Product ID required.' });

    const product = await getOne('SELECT id, stock FROM products WHERE id = ? AND is_active = 1', [product_id]);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (product.stock < quantity) return res.status(400).json({ error: 'Insufficient stock.' });

    const existing = await getOne('SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]);
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock) return res.status(400).json({ error: 'Insufficient stock.' });
      await runSql('UPDATE cart SET quantity = ? WHERE id = ?', [newQty, existing.id]);
    } else {
      await runSql('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [req.user.id, product_id, quantity]);
    }

    const count = await getOne('SELECT COUNT(*) as count FROM cart WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Added to cart.', cartCount: count.count });
  } catch (err) { res.status(500).json({ error: 'Failed to add to cart: ' + err.message }); }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) return res.status(400).json({ error: 'Invalid quantity.' });

    const cartItem = await getOne('SELECT c.*, p.stock FROM cart c JOIN products p ON c.product_id = p.id WHERE c.id = ? AND c.user_id = ?', [req.params.id, req.user.id]);
    if (!cartItem) return res.status(404).json({ error: 'Cart item not found.' });
    if (quantity > cartItem.stock) return res.status(400).json({ error: 'Insufficient stock.' });

    await runSql('UPDATE cart SET quantity = ? WHERE id = ?', [quantity, req.params.id]);
    res.json({ message: 'Cart updated.' });
  } catch (err) { res.status(500).json({ error: 'Failed to update cart.' }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await runSql('DELETE FROM cart WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Removed from cart.' });
  } catch (err) { res.status(500).json({ error: 'Failed to remove from cart.' }); }
});

router.delete('/', authenticate, async (req, res) => {
  try {
    await runSql('DELETE FROM cart WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Cart cleared.' });
  } catch (err) { res.status(500).json({ error: 'Failed to clear cart.' }); }
});

module.exports = router;
