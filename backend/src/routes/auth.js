const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getOne, runSql } = require('../models/database');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const existing = await getOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'Email already registered.' });

    const hashedPassword = bcrypt.hashSync(password, 10);
    const userRole = role === 'seller' ? 'seller' : 'customer';
    const result = await runSql('INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)', [name, email, hashedPassword, phone || null, userRole]);

    const user = await getOne('SELECT id, name, email, role FROM users WHERE id = ?', [result.lastInsertRowid]);
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({ message: 'Registration successful.', user, accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = await getOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
    if (!user.is_active) return res.status(403).json({ error: 'Account is deactivated.' });

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

    const tokenUser = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenUser);
    const refreshToken = generateRefreshToken(tokenUser);

    const { password: _, ...safeUser } = user;
    res.json({ message: 'Login successful.', user: safeUser, accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required.' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await getOne('SELECT id, email, role FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(401).json({ error: 'Invalid refresh token.' });

    const accessToken = generateAccessToken(user);
    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

router.get('/profile', authenticate, async (req, res) => {
  const user = await getOne('SELECT id, name, email, phone, address, city, avatar, role, created_at FROM users WHERE id = ?', [req.user.id]);
  res.json({ user });
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, address, city } = req.body;
    const current = await getOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    await runSql('UPDATE users SET name = ?, phone = ?, address = ?, city = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name || current.name, phone || current.phone, address || current.address, city || current.city, req.user.id]);

    const user = await getOne('SELECT id, name, email, phone, address, city, avatar, role FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Profile updated.', user });
  } catch (err) {
    res.status(500).json({ error: 'Update failed: ' + err.message });
  }
});

router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await getOne('SELECT password FROM users WHERE id = ?', [req.user.id]);

    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const hashed = bcrypt.hashSync(newPassword, 10);
    await runSql('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Password change failed.' });
  }
});

module.exports = router;
