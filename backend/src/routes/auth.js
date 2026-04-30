const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const supabase = require('../services/supabase');
const { authMiddleware } = require('../middleware/auth');

// POST /api/auth/request-signup — New user submits signup request
router.post('/request-signup', async (req, res) => {
  try {
    const { name, mobile, email, password } = req.body;

    if (!name || !mobile || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if already requested or exists
    const { data: existing } = await supabase
      .from('signup_requests')
      .select('id, status')
      .or(`email.eq.${email},mobile.eq.${mobile}`)
      .single();

    if (existing) {
      return res.status(409).json({
        error: existing.status === 'pending'
          ? 'A request with this email or mobile already exists. Please wait for admin approval.'
          : existing.status === 'rejected'
          ? 'Your previous request was rejected. Contact admin for details.'
          : 'Account already exists. Please login.'
      });
    }

    // Also check active users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email},mobile.eq.${mobile}`)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'Account with this email or mobile already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { error } = await supabase.from('signup_requests').insert({
      name, mobile, email, password_hash, status: 'pending'
    });

    if (error) throw error;

    res.status(201).json({
      message: 'Signup request submitted! Admin will review and approve your account. You will be able to login once approved.'
    });
  } catch (err) {
    console.error('Signup request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login — User login (only active users)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if pending/rejected first
    const { data: req_data } = await supabase
      .from('signup_requests')
      .select('status')
      .eq('email', email)
      .single();

    if (req_data?.status === 'pending') {
      return res.status(403).json({ error: 'Your account is awaiting admin approval. Please check back later.' });
    }
    if (req_data?.status === 'rejected') {
      return res.status(403).json({ error: 'Your signup request was rejected. Please contact admin.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Your account has been blocked. Contact admin.' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account not active. Contact admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update online status
    await supabase.from('users').update({ is_online: true, last_seen: new Date() }).eq('id', user.id);

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Remove password from response
    const { password_hash: _, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    await supabase.from('users').update({
      is_online: false,
      last_seen: new Date()
    }).eq('id', req.userId);
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, mobile, email, avatar_url, status, about, is_online, last_seen, created_at')
      .eq('id', req.userId)
      .single();
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/profile — Update profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, about, avatar_url } = req.body;
    const { data, error } = await supabase
      .from('users')
      .update({ name, about, avatar_url, updated_at: new Date() })
      .eq('id', req.userId)
      .select('id, name, about, avatar_url, email, mobile, status')
      .single();
    if (error) throw error;
    res.json({ user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/check-request — Check signup request status
router.post('/check-request', async (req, res) => {
  try {
    const { email } = req.body;
    const { data } = await supabase
      .from('signup_requests')
      .select('status, rejection_reason, requested_at')
      .eq('email', email)
      .single();
    res.json({ request: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
