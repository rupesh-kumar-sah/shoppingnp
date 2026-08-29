const express = require('express');
const { getOne, getAll, runSql } = require('../models/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const categories = await getAll(`SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count FROM categories c WHERE c.is_active = 1 ORDER BY c.name ASC`, []);
    res.json({ categories });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch categories.' }); }
});

router.get('/:slug', async (req, res) => {
  try {
    const category = await getOne('SELECT * FROM categories WHERE (slug = ? OR id = ?) AND is_active = 1', [req.params.slug, req.params.slug]);
    if (!category) return res.status(404).json({ error: 'Category not found.' });
    res.json({ category });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch category.' }); }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, image, parent_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required.' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await getOne('SELECT id FROM categories WHERE slug = ?', [slug]);
    if (existing) return res.status(400).json({ error: 'Category already exists.' });

    const result = await runSql('INSERT INTO categories (name, slug, description, image, parent_id) VALUES (?, ?, ?, ?, ?)', [name, slug, description || '', image || null, parent_id || null]);
    const category = await getOne('SELECT * FROM categories WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Category created.', category });
  } catch (err) { res.status(500).json({ error: 'Failed to create category: ' + err.message }); }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, image, is_active } = req.body;
    const current = await getOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!current) return res.status(404).json({ error: 'Category not found.' });

    await runSql('UPDATE categories SET name = ?, description = ?, image = ?, is_active = ? WHERE id = ?',
      [name || current.name, description !== undefined ? description : current.description, image || current.image, is_active !== undefined ? (is_active ? 1 : 0) : current.is_active, req.params.id]);

    const category = await getOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category updated.', category });
  } catch (err) { res.status(500).json({ error: 'Failed to update category.' }); }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await runSql('UPDATE products SET category_id = NULL WHERE category_id = ?', [req.params.id]);
    await runSql('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted.' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete category.' }); }
});

module.exports = router;
