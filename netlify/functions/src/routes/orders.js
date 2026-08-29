const express = require('express');
const { getOne, getAll, runSql } = require('../models/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const { shipping_name, shipping_address, shipping_city, shipping_phone, payment_method, notes, coupon_code } = req.body;
    if (!shipping_name || !shipping_address || !shipping_city || !shipping_phone) {
      return res.status(400).json({ error: 'Shipping details are required.' });
    }

    const cartItems = await getAll(`SELECT c.*, p.price, p.name, p.stock, p.id as pid FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ? AND p.is_active = 1`, [req.user.id]);
    if (cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty.' });

    for (const item of cartItems) {
      if (item.quantity > item.stock) return res.status(400).json({ error: `Insufficient stock for ${item.name}.` });
    }

    let subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discountAmount = 0;

    if (coupon_code) {
      const coupon = await getOne('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [coupon_code]);
      if (coupon) {
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return res.status(400).json({ error: 'Coupon has expired.' });
        if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return res.status(400).json({ error: 'Coupon usage limit reached.' });
        if (subtotal < coupon.min_order_amount) return res.status(400).json({ error: `Minimum order amount for coupon is $${coupon.min_order_amount}.` });

        discountAmount = coupon.discount_type === 'percentage' ? subtotal * (coupon.discount_value / 100) : coupon.discount_value;
        discountAmount = Math.min(discountAmount, subtotal);
        await runSql('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id]);
      }
    }

    const shippingAmount = subtotal > 50 ? 0 : 5.99;
    const taxAmount = Math.round((subtotal - discountAmount) * 0.1 * 100) / 100;
    const totalAmount = Math.round((subtotal - discountAmount + shippingAmount + taxAmount) * 100) / 100;

    const orderResult = await runSql(`INSERT INTO orders (user_id, total_amount, shipping_amount, tax_amount, discount_amount, payment_method, shipping_name, shipping_address, shipping_city, shipping_phone, notes, status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid')`,
      [req.user.id, totalAmount, shippingAmount, taxAmount, discountAmount, payment_method || 'cod', shipping_name, shipping_address, shipping_city, shipping_phone, notes || '']);

    const orderId = orderResult.lastInsertRowid;

    for (const item of cartItems) {
      await runSql('INSERT INTO order_items (order_id, product_id, quantity, price, total) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.pid, item.quantity, item.price, item.price * item.quantity]);
      await runSql('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.pid]);
    }

    await runSql('INSERT INTO payments (order_id, method, amount, status) VALUES (?, ?, ?, ?)',
      [orderId, payment_method || 'cod', totalAmount, 'pending']);
    await runSql('DELETE FROM cart WHERE user_id = ?', [req.user.id]);

    const order = await getOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.status(201).json({ message: 'Order placed successfully!', order, summary: { subtotal, discount: discountAmount, shipping: shippingAmount, tax: taxAmount, total: totalAmount } });
  } catch (err) { res.status(500).json({ error: 'Failed to place order: ' + err.message }); }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE o.user_id = ?';
    let params = [req.user.id];
    if (status) { where += ' AND o.status = ?'; params.push(status); }

    const orders = await getAll(`SELECT o.* FROM orders o ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), parseInt(offset)]);

    for (const order of orders) {
      order.items = await getAll(`SELECT oi.*, p.name, p.image, p.slug FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`, [order.id]);
    }

    const countResult = await getOne(`SELECT COUNT(*) as total FROM orders o ${where}`, params);
    res.json({ orders, pagination: { total: countResult.total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch orders.' }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    let order;
    if (req.user.role === 'admin') {
      order = await getOne('SELECT o.*, u.name as customer_name, u.email as customer_email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?', [req.params.id]);
    } else {
      order = await getOne('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    }
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    order.items = await getAll(`SELECT oi.*, p.name, p.image, p.slug FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`, [order.id]);
    const payment = await getOne('SELECT * FROM payments WHERE order_id = ?', [order.id]);
    res.json({ order, payment });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch order.' }); }
});

router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const order = await getOne('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (!['pending', 'confirmed'].includes(order.status)) return res.status(400).json({ error: 'Order cannot be cancelled at this stage.' });

    await runSql('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['cancelled', order.id]);
    const items = await getAll('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    for (const item of items) {
      await runSql('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
    }
    res.json({ message: 'Order cancelled.' });
  } catch (err) { res.status(500).json({ error: 'Failed to cancel order.' }); }
});

module.exports = router;
