const express  = require('express');
const router   = express.Router();
const supabase = require('../services/supabase');
const { authMiddleware } = require('../middleware/auth');

// GET /api/users/search?q=name_or_mobile — Search users to add contact
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });

    const { data, error } = await supabase
      .from('users')
      .select('id, name, mobile, avatar_url, about, is_online, last_seen')
      .eq('status', 'active')
      .neq('id', req.userId)
      .or(`name.ilike.%${q}%,mobile.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(20);

    if (error) throw error;
    res.json({ users: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/contacts — Get my contacts
router.get('/contacts', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        id, saved_name, is_blocked, created_at,
        contact:contact_id(id, name, mobile, avatar_url, about, is_online, last_seen)
      `)
      .eq('user_id', req.userId)
      .eq('is_blocked', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ contacts: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/contacts — Add/save a contact with custom name
router.post('/contacts', authMiddleware, async (req, res) => {
  try {
    const { contact_id, saved_name } = req.body;
    if (!contact_id) return res.status(400).json({ error: 'contact_id required' });
    if (contact_id === req.userId) return res.status(400).json({ error: 'Cannot add yourself' });

    // Verify contact exists and is active
    const { data: contactUser } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', contact_id)
      .eq('status', 'active')
      .single();

    if (!contactUser) return res.status(404).json({ error: 'User not found' });

    const { data, error } = await supabase
      .from('contacts')
      .upsert({
        user_id: req.userId,
        contact_id,
        saved_name: saved_name || contactUser.name
      }, { onConflict: 'user_id,contact_id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ contact: data, message: 'Contact saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/contacts/:contactId — Update saved name
router.put('/contacts/:contactId', authMiddleware, async (req, res) => {
  try {
    const { saved_name } = req.body;
    const { data, error } = await supabase
      .from('contacts')
      .update({ saved_name })
      .eq('user_id', req.userId)
      .eq('contact_id', req.params.contactId)
      .select()
      .single();
    if (error) throw error;
    res.json({ contact: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/contacts/:contactId — Remove contact
router.delete('/contacts/:contactId', authMiddleware, async (req, res) => {
  try {
    await supabase
      .from('contacts')
      .delete()
      .eq('user_id', req.userId)
      .eq('contact_id', req.params.contactId);
    res.json({ message: 'Contact removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:userId — Get user profile
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, mobile, avatar_url, about, is_online, last_seen')
      .eq('id', req.params.userId)
      .eq('status', 'active')
      .single();
    if (error || !data) return res.status(404).json({ error: 'User not found' });
    res.json({ user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
