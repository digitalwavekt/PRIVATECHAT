const express  = require('express');
const router   = express.Router();
const supabase = require('../services/supabase');
const { authMiddleware } = require('../middleware/auth');

// GET /api/conversations — Get all my conversations
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Get all conversation IDs where I'm a member
    const { data: memberships } = await supabase
      .from('conversation_members')
      .select('conversation_id, last_read_at, is_muted')
      .eq('user_id', req.userId);

    if (!memberships || memberships.length === 0) return res.json({ conversations: [] });

    const convIds = memberships.map(m => m.conversation_id);

    // Get conversations with member details
    const { data: convs, error } = await supabase
      .from('conversations')
      .select(`
        id, type, name, description, avatar_url,
        last_message, last_message_at,
        last_message_by,
        conversation_members(
          user_id, role, last_read_at,
          user:user_id(id, name, avatar_url, is_online, last_seen)
        )
      `)
      .in('id', convIds)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    // Merge membership data (muted, last_read) into conversations
    const membershipMap = {};
    memberships.forEach(m => { membershipMap[m.conversation_id] = m; });

    const enriched = (convs || []).map(conv => ({
      ...conv,
      is_muted:     membershipMap[conv.id]?.is_muted,
      my_last_read: membershipMap[conv.id]?.last_read_at,
    }));

    res.json({ conversations: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/conversations/direct — Create or get 1-to-1 chat
router.post('/direct', authMiddleware, async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    if (user_id === req.userId) return res.status(400).json({ error: 'Cannot chat with yourself' });

    // Check if direct conversation already exists
    const { data: existing } = await supabase.rpc('find_direct_conversation', {
      user1: req.userId,
      user2: user_id
    });

    if (existing && existing.length > 0) {
      const { data: conv } = await supabase
        .from('conversations')
        .select(`*, conversation_members(user_id, user:user_id(id, name, avatar_url, is_online, last_seen))`)
        .eq('id', existing[0].conversation_id)
        .single();
      return res.json({ conversation: conv, created: false });
    }

    // Create new direct conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ type: 'direct', created_by: req.userId })
      .select()
      .single();

    if (convErr) throw convErr;

    // Add both members
    await supabase.from('conversation_members').insert([
      { conversation_id: conv.id, user_id: req.userId, role: 'member' },
      { conversation_id: conv.id, user_id, role: 'member' }
    ]);

    const { data: fullConv } = await supabase
      .from('conversations')
      .select(`*, conversation_members(user_id, user:user_id(id, name, avatar_url, is_online, last_seen))`)
      .eq('id', conv.id)
      .single();

    res.status(201).json({ conversation: fullConv, created: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/conversations/group — Create group chat
router.post('/group', authMiddleware, async (req, res) => {
  try {
    const { name, description, member_ids, avatar_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name required' });

    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({ type: 'group', name, description, avatar_url, created_by: req.userId })
      .select()
      .single();

    if (error) throw error;

    // Add creator as admin + all members
    const allMembers = [...new Set([req.userId, ...(member_ids || [])])];
    const membersToInsert = allMembers.map(uid => ({
      conversation_id: conv.id,
      user_id: uid,
      role: uid === req.userId ? 'admin' : 'member'
    }));

    await supabase.from('conversation_members').insert(membersToInsert);

    // System message
    await supabase.from('messages').insert({
      conversation_id: conv.id,
      sender_id: req.userId,
      type: 'system',
      content: `Group "${name}" created`
    });

    const { data: fullConv } = await supabase
      .from('conversations')
      .select(`*, conversation_members(user_id, role, user:user_id(id, name, avatar_url, is_online))`)
      .eq('id', conv.id)
      .single();

    // Notify all members via socket
    const io = req.app.get('io');
    allMembers.forEach(uid => {
      io.to(`user:${uid}`).emit('conversation:new', fullConv);
    });

    res.status(201).json({ conversation: fullConv });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/conversations/:id — Update group info
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, avatar_url } = req.body;

    // Only group admin can update
    const { data: member } = await supabase
      .from('conversation_members')
      .select('role')
      .eq('conversation_id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (!member || member.role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can update group info' });
    }

    const { data, error } = await supabase
      .from('conversations')
      .update({ name, description, avatar_url, updated_at: new Date() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ conversation: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/conversations/:id/members — Add members to group
router.post('/:id/members', authMiddleware, async (req, res) => {
  try {
    const { user_ids } = req.body;
    const members = user_ids.map(uid => ({
      conversation_id: req.params.id,
      user_id: uid,
      role: 'member'
    }));
    await supabase.from('conversation_members').upsert(members, { onConflict: 'conversation_id,user_id' });

    // System message
    await supabase.from('messages').insert({
      conversation_id: req.params.id,
      sender_id: req.userId,
      type: 'system',
      content: `${user_ids.length} member(s) added to group`
    });

    res.json({ message: 'Members added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/conversations/:id/leave — Leave group
router.delete('/:id/leave', authMiddleware, async (req, res) => {
  try {
    await supabase.from('conversation_members')
      .delete()
      .eq('conversation_id', req.params.id)
      .eq('user_id', req.userId);
    res.json({ message: 'Left group' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/conversations/:id/read — Mark as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    await supabase.from('conversation_members')
      .update({ last_read_at: new Date() })
      .eq('conversation_id', req.params.id)
      .eq('user_id', req.userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
