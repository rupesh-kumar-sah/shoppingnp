const express = require('express');
const { getOne, getAll, runSql } = require('../models/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', authenticate, authorize('admin'), async (req, res) => {
  try {
    const totalProducts = (await getOne('SELECT COUNT(*) as count FROM products', [])).count;
    const totalOrders = (await getOne('SELECT COUNT(*) as count FROM orders', [])).count;
    const totalUsers = (await getOne("SELECT COUNT(*) as count FROM users WHERE role = 'customer'", [])).count;
    const totalRevenue = (await getOne("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = 'paid'", [])).total;
    const pendingOrders = (await getOne("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'", [])).count;
    const processingOrders = (await getOne("SELECT COUNT(*) as count FROM orders WHERE status = 'processing'", [])).count;
    const deliveredOrders = (await getOne("SELECT COUNT(*) as count FROM orders WHERE status = 'delivered'", [])).count;

    const recentOrders = await getAll(`SELECT o.*, u.name as customer_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 10`, []);

    const monthlySales = await getAll(`SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE created_at >= date('now', '-12 months') GROUP BY strftime('%Y-%m', created_at) ORDER BY month ASC`, []);

    const topProducts = await getAll(`SELECT p.id, p.name, p.image, p.price, COALESCE(SUM(oi.quantity), 0) as total_sold, COALESCE(SUM(oi.total), 0) as total_revenue FROM products p LEFT JOIN order_items oi ON p.id = oi.product_id GROUP BY p.id ORDER BY total_sold DESC LIMIT 5`, []);

    const ordersByStatus = await getAll('SELECT status, COUNT(*) as count FROM orders GROUP BY status', []);

    res.json({
      stats: { totalProducts, totalOrders, totalUsers, totalRevenue, pendingOrders, processingOrders, deliveredOrders },
      recentOrders, monthlySales, topProducts, ordersByStatus
    });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch dashboard: ' + err.message }); }
});

router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (page - 1) * limit;
    let where = []; let params = [];
    if (role) { where.push('role = ?'); params.push(role); }
    if (search) { where.push('(name LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const users = await getAll(`SELECT id, name, email, phone, role, is_active, created_at FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), parseInt(offset)]);
    const total = (await getOne(`SELECT COUNT(*) as count FROM users ${whereClause}`, params)).count;
    res.json({ users, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch users.' }); }
});

router.put('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role, is_active } = req.body;
    const current = await getOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!current) return res.status(404).json({ error: 'User not found.' });

    await runSql('UPDATE users SET role = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [role || current.role, is_active !== undefined ? (is_active ? 1 : 0) : current.is_active, req.params.id]);

    const user = await getOne('SELECT id, name, email, role, is_active FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User updated.', user });
  } catch (err) { res.status(500).json({ error: 'Failed to update user.' }); }
});

router.get('/orders', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, payment_status, search } = req.query;
    const offset = (page - 1) * limit;
    let where = []; let params = [];
    if (status) { where.push('o.status = ?'); params.push(status); }
    if (payment_status) { where.push('o.payment_status = ?'); params.push(payment_status); }
    if (search) { where.push('(u.name LIKE ? OR u.email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const orders = await getAll(`SELECT o.*, u.name as customer_name, u.email as customer_email FROM orders o JOIN users u ON o.user_id = u.id ${whereClause} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), parseInt(offset)]);
    for (const order of orders) {
      order.items = await getAll('SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [order.id]);
    }
    const total = (await getOne(`SELECT COUNT(*) as count FROM orders o JOIN users u ON o.user_id = u.id ${whereClause}`, params)).count;
    res.json({ orders, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch orders: ' + err.message }); }
});

router.put('/orders/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status, payment_status } = req.body;
    if (status) await runSql('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
    if (payment_status) {
      await runSql('UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [payment_status, req.params.id]);
      await runSql('UPDATE payments SET status = ? WHERE order_id = ?', [payment_status === 'paid' ? 'completed' : payment_status, req.params.id]);
    }
    const order = await getOne('SELECT o.*, u.name as customer_name FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?', [req.params.id]);
    res.json({ message: 'Order updated.', order });
  } catch (err) { res.status(500).json({ error: 'Failed to update order.' }); }
});

router.get('/products', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category } = req.query;
    const offset = (page - 1) * limit;
    let where = []; let params = [];
    if (search) { where.push('(p.name LIKE ? OR p.sku LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (category) { where.push('p.category_id = ?'); params.push(category); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const products = await getAll(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ${whereClause} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), parseInt(offset)]);
    const total = (await getOne(`SELECT COUNT(*) as count FROM products p ${whereClause}`, params)).count;
    res.json({ products, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch products.' }); }
});

router.get('/coupons', authenticate, authorize('admin'), async (req, res) => {
  try {
    const coupons = await getAll('SELECT * FROM coupons ORDER BY created_at DESC', []);
    res.json({ coupons });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch coupons.' }); }
});

router.post('/coupons', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { code, description, discount_type, discount_value, min_order_amount, max_uses, expires_at } = req.body;
    if (!code || !discount_type || !discount_value) return res.status(400).json({ error: 'Code, discount type and value are required.' });
    const result = await runSql('INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [code.toUpperCase(), description || '', discount_type, discount_value, min_order_amount || 0, max_uses || null, expires_at || null]);
    const coupon = await getOne('SELECT * FROM coupons WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Coupon created.', coupon });
  } catch (err) { res.status(500).json({ error: 'Failed to create coupon: ' + err.message }); }
});

router.delete('/coupons/:id', authenticate, authorize('admin'), async (req, res) => {
  try { await runSql('DELETE FROM coupons WHERE id = ?', [req.params.id]); res.json({ message: 'Coupon deleted.' }); }
  catch (err) { res.status(500).json({ error: 'Failed to delete coupon.' }); }
});

router.get('/reviews', authenticate, authorize('admin'), async (req, res) => {
  try {
    const reviews = await getAll('SELECT r.*, u.name as user_name, p.name as product_name FROM reviews r JOIN users u ON r.user_id = u.id JOIN products p ON r.product_id = p.id ORDER BY r.created_at DESC', []);
    res.json({ reviews });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch reviews.' }); }
});

router.put('/reviews/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { is_approved } = req.body;
    await runSql('UPDATE reviews SET is_approved = ? WHERE id = ?', [is_approved ? 1 : 0, req.params.id]);
    res.json({ message: 'Review updated.' });
  } catch (err) { res.status(500).json({ error: 'Failed to update review.' }); }
});

module.exports = router;
