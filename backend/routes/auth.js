import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'gene_guard_jwt_secret_key_2026_super_secure';
const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE || 'GENE_GUARD_ADMIN_2026';

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  console.log('[Signup API] Incoming signup request payload:', {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    phone: req.body.phone,
    role: req.body.role,
  });
  console.log('[Signup API] Mongoose connection state:', mongoose.connection.readyState);

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      password,
      role = 'user',
      adminCode,
      consentGiven = true,
    } = req.body;

    // Handle Guest sign up / session
    if (role === 'guest') {
      const guestId = 'guest-' + Date.now();
      const token = jwt.sign({ userId: guestId, role: 'guest', firstName: 'Guest' }, JWT_SECRET, {
        expiresIn: '7d',
      });
      return res.status(200).json({
        success: true,
        message: 'Guest session created',
        token,
        userId: guestId,
        firstName: 'Guest',
        role: 'guest',
      });
    }

    // 1. Server-side Validations
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ success: false, error: 'First Name is required' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Invalid email address format' });
    }

    if (phone && phone.trim() && !/^\d{10}$/.test(phone.trim())) {
      return res.status(400).json({ success: false, error: 'Phone number must be exactly 10 digits' });
    }

    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long' });
    }

    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!hasNumber || !hasSpecial) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain at least one number and one special character',
      });
    }

    // 2. Admin Code verification
    if (role === 'admin') {
      if (!adminCode || adminCode.trim() !== ADMIN_SECRET_CODE) {
        return res.status(403).json({ success: false, error: 'Invalid Admin Secret Code' });
      }
    }

    // 3. Check for existing email in MongoDB
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      console.log('[Signup API] User already exists with email:', normalizedEmail);
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }

    // 4. Hash password and save user
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName: firstName.trim(),
      lastName: (lastName || '').trim(),
      email: normalizedEmail,
      phone: (phone || '').trim(),
      dateOfBirth: dateOfBirth || '',
      passwordHash,
      role,
      consentGiven: Boolean(consentGiven),
    });

    console.log('[Signup API] Saving new user document to MongoDB for email:', normalizedEmail);
    const savedUser = await newUser.save();
    console.log('[Signup API] ✓ Successfully inserted user document into MongoDB with _id:', savedUser._id);

    // 5. Generate JWT token
    const token = jwt.sign(
      { userId: savedUser._id, role: savedUser.role, firstName: savedUser.firstName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      userId: savedUser._id,
      firstName: savedUser.firstName,
      role: savedUser.role,
    });
  } catch (error) {
    console.error('[Signup API] ✗ Signup error during MongoDB insertion:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error during registration' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, role = 'user' } = req.body;

    // Handle Guest login
    if (role === 'guest') {
      const guestId = 'guest-' + Date.now();
      const token = jwt.sign({ userId: guestId, role: 'guest', firstName: 'Guest' }, JWT_SECRET, {
        expiresIn: '7d',
      });
      return res.status(200).json({
        success: true,
        token,
        userId: guestId,
        firstName: 'Guest',
        role: 'guest',
      });
    }

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role, firstName: user.firstName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      userId: user._id,
      firstName: user.firstName,
      role: user.role,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during login' });
  }
});

export default router;
