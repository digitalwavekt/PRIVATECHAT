const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const supabase = require('../services/supabase');
const { adminMiddleware } = require('../middleware/auth');

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !admin) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, name: admin.name },
      process.env.JWT_ADMIN_SECRET,
      { expiresIn: '12h' }
    );

    const { password_hash: _, ...safeAdmin } = admin;
    res.json({ token, admin: safeAdmin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats — Dashboard stats
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const [users, pending, blocked, messages, convs] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('signup_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'blocked'),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('conversations').select('*', { count: 'exact', head: true })
    ]);

    // Online users
    const { count: online } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true);

    res.json({
      total_users:    users.count || 0,
      pending_users:  pending.count || 0,
      blocked_users:  blocked.count || 0,
      online_users:   online || 0,
      total_messages: messages.count || 0,
      total_chats:    convs.count || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/signup-requests — Pending signup requests
router.get('/signup-requests', adminMiddleware, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const { data, error } = await supabase
      .from('signup_requests')
      .select('*')
      .eq('status', status)
      .order('requested_at', { ascending: false });
    if (error) throw error;
    res.json({ requests: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/signup-requests/:id/approve — Approve user
router.post('/signup-requests/:id/approve', adminMiddleware, async (req, res) => {
  try {
    const { data: request } = await supabase
      .from('signup_requests')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    // Create the user
    const { error: userErr } = await supabase.from('users').insert({
      name:          request.name,
      mobile:        request.mobile,
      email:         request.email,
      password_hash: request.password_hash,
      status:        'active'
    });

    if (userErr) throw userErr;

    // Update request status
    await supabase.from('signup_requests').update({
      status:      'approved',
      reviewed_at: new Date(),
      reviewed_by: req.adminId
    }).eq('id', req.params.id);

    // Log action
    await supabase.from('admin_logs').insert({
      admin_id:  req.adminId,
      action:    'approve_user',
      target_id: req.params.id,
      details:   { email: request.email, name: request.name }
    });

    res.json({ message: `User ${request.name} approved and account created` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/signup-requests/:id/reject — Reject request
router.post('/signup-requests/:id/reject', adminMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    await supabase.from('signup_requests').update({
      status:           'rejected',
      rejection_reason: reason || 'Request rejected by admin',
      reviewed_at:      new Date(),
      reviewed_by:      req.adminId
    }).eq('id', req.params.id);

    await supabase.from('admin_logs').insert({
      admin_id: req.adminId, action: 'reject_user',
      target_id: req.params.id, details: { reason }
    });

    res.json({ message: 'Request rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users — All users
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;
    let query = supabase
      .from('users')
      .select('id, name, mobile, email, avatar_url, status, is_online, last_seen, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status) query = query.eq('status', status);
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,mobile.ilike.%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ users: data || [], total: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/block — Block user
router.put('/users/:id/block', adminMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    await supabase.from('users').update({ status: 'blocked' }).eq('id', req.params.id);

    await supabase.from('admin_logs').insert({
      admin_id: req.adminId, action: 'block_user',
      target_id: req.params.id, details: { reason }
    });

    // Force disconnect via socket
    const io = req.app.get('io');
    io.to(`user:${req.params.id}`).emit('account:blocked', { reason });

    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/unblock — Unblock user
router.put('/users/:id/unblock', adminMiddleware, async (req, res) => {
  try {
    await supabase.from('users').update({ status: 'active' }).eq('id', req.params.id);
    await supabase.from('admin_logs').insert({
      admin_id: req.adminId, action: 'unblock_user', target_id: req.params.id
    });
    res.json({ message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users/:id/messages — View user's messages (monitoring)
router.get('/users/:id/messages', adminMiddleware, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id, type, content, file_url, latitude, longitude, created_at,
        conversation:conversation_id(id, type, name),
        sender:sender_id(id, name, email)
      `)
      .eq('sender_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    if (error) throw error;
    res.json({ messages: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/messages — All messages (global monitoring)
router.get('/messages', adminMiddleware, async (req, res) => {
  try {
    const { limit = 100, offset = 0, type } = req.query;
    let query = supabase
      .from('messages')
      .select(`
        id, type, content, file_url, created_at,
        sender:sender_id(id, name, email),
        conversation:conversation_id(id, type, name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (type) query = query.eq('type', type);

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ messages: data || [], total: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/messages/:id — Delete any message
router.delete('/messages/:id', adminMiddleware, async (req, res) => {
  try {
    const { data: msg } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('id', req.params.id)
      .single();

    await supabase.from('messages').update({
      deleted_for_everyone: true,
      content: '[Removed by admin]',
      file_url: null
    }).eq('id', req.params.id);

    await supabase.from('admin_logs').insert({
      admin_id: req.adminId, action: 'delete_message', target_id: req.params.id
    });

    const io = req.app.get('io');
    io.to(`conv:${msg?.conversation_id}`).emit('message:deleted', {
      message_id: req.params.id,
      conversation_id: msg?.conversation_id
    });

    res.json({ message: 'Message removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/logs — Admin action logs
router.get('/logs', adminMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('admin_logs')
      .select('*, admin:admin_id(name, email)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    res.json({ logs: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
