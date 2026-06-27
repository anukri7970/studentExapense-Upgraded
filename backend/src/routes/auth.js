const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { fundWithFriendbot } = require('../services/stellarService');
const { track } = require('../config/analytics');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password, role, stellarPublicKey } = req.body;

    if (!name || !email || !password || !role || !stellarPublicKey) {
      return res.status(400).json({ error: 'name, email, password, role, and stellarPublicKey are all required.' });
    }
    if (!['parent', 'student', 'university'].includes(role)) {
      return res.status(400).json({ error: 'role must be one of: parent, student, university.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      stellarPublicKey,
    });

    // Fund via friendbot in the background-ish; don't block signup success
    // on it, but do report failures clearly so the dashboard can show
    // "wallet pending funding" instead of silently looking broken.
    try {
      await fundWithFriendbot(stellarPublicKey);
      user.walletFunded = true;
      await user.save();
    } catch (fundErr) {
      console.error(`Friendbot funding failed for new ${role} wallet: ${fundErr.message}`);
    }

    track(user._id.toString(), 'wallet_connected', { role: user.role });

    const token = signToken(user);
    return res.status(201).json({ token, user: user.toSafeJSON() });
  } catch (err) {
    err.category = err.category || 'api';
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    return res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
