const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/env');
const auth = require('../middlewares/auth');

const router = express.Router();

router.post('/customer-register', async (req, res) => {
  try {
    const {
      username,
      password,
      fullName = '',
      phone = '',
      defaultAddress = '',
    } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({ message: 'Username, password, and full name are required' });
    }

    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername.length < 4) {
      return res.status(400).json({ message: 'Username must be at least 4 characters' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ username: trimmedUsername }).lean();
    if (existing) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: trimmedUsername,
      passwordHash,
      role: 'CUSTOMER',
      fullName: String(fullName).trim(),
      phone: String(phone).trim(),
      defaultAddress: String(defaultAddress).trim(),
    });

    return res.status(201).json({
      message: 'Customer account created',
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Customer registration failed', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username: username.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid login' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid login' });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role,
        fullName: user.fullName || '',
      },
      jwtSecret,
      { expiresIn: '1d' }
    );

    return res.json({
      token,
      username: user.username,
      role: user.role,
      fullName: user.fullName || '',
      phone: user.phone || '',
      defaultAddress: user.defaultAddress || '',
    });
  } catch (err) {
    return res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

router.patch('/me', auth, async (req, res) => {
  try {
    const { fullName, phone, defaultAddress, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (typeof fullName === 'string') user.fullName = fullName.trim();
    if (typeof phone === 'string') user.phone = phone.trim();
    if (typeof defaultAddress === 'string') user.defaultAddress = defaultAddress.trim();

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set new password' });
      }
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      if (String(newPassword).length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
      }
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    return res.json({
      message: 'Profile updated',
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        fullName: user.fullName || '',
        phone: user.phone || '',
        defaultAddress: user.defaultAddress || '',
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Profile update failed', error: err.message });
  }
});

module.exports = router;
