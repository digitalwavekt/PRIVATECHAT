const express  = require('express');
const router   = express.Router();
const supabase = require('../services/supabase');
const { authMiddleware } = require('../middleware/auth');

// GET /api/messages/:conversationId — Get messages (paginated)
router.get('/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { before, limit = 50 } = req.query;
    const convId = req.params.conversationId;

    // Verify membership
    const { data: member } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', convId)
      .eq('user_id', req.userId)
      .single();

    if (!member) return res.status(403).json({ error: 'Not a member of this conversation' });

    let query = supabase
      .from('messages')
      .select(`
        id, type, content, file_url, file_name, file_size, file_mime,
        duration, thumbnail_url, latitude, longitude, location_name,
        reply_to_id, is_deleted, deleted_for_everyone, created_at,
        sender:sender_id(id, name, avatar_url),
        reply_to:reply_to_id(id, content, type, sender:sender_id(name))
      `)
      .eq('conversation_id', convId)
      .eq('deleted_for_everyone', false)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    // Reverse for chronological order
    res.json({ messages: (messages || []).reverse() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages — Send text/location message
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      conversation_id, type = 'text', content,
      file_url, file_name, file_size, file_mime,
      duration, thumbnail_url,
      latitude, longitude, location_name,
      reply_to_id
    } = req.body;

    if (!conversation_id) return res.status(400).json({ error: 'conversation_id required' });

    // Verify membership
    const { data: member } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', conversation_id)
      .eq('user_id', req.userId)
      .single();

    if (!member) return res.status(403).json({ error: 'Not a member' });

    const { data: message, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id, sender_id: req.userId,
        type, content, file_url, file_name, file_size, file_mime,
        duration, thumbnail_url,
        latitude, longitude, location_name,
        reply_to_id: reply_to_id || null
      })
      .select(`
        id, type, content, file_url, file_name, file_size, file_mime,
        duration, thumbnail_url, latitude, longitude, location_name,
        reply_to_id, created_at,
        sender:sender_id(id, name, avatar_url),
        reply_to:reply_to_id(id, content, type, sender:sender_id(name))
      `)
      .single();

    if (msgErr) throw msgErr;

    // Update conversation last message
    await supabase.from('conversations').update({
      last_message:    type === 'text' ? content : `[${type}]`,
      last_message_at: message.created_at,
      last_message_by: req.userId,
      updated_at:      new Date()
    }).eq('id', conversation_id);

    // Emit via socket
    const io = req.app.get('io');
    io.to(`conv:${conversation_id}`).emit('message:new', { message, conversation_id });

    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/messages/:id — Delete message
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { for_everyone } = req.body;

    const { data: msg } = await supabase
      .from('messages')
      .select('sender_id, conversation_id')
      .eq('id', req.params.id)
      .single();

    if (!msg) return res.status(404).json({ error: 'Message not found' });

    if (for_everyone) {
      if (msg.sender_id !== req.userId) {
        return res.status(403).json({ error: 'Can only delete your own messages for everyone' });
      }
      await supabase.from('messages')
        .update({ deleted_for_everyone: true, content: 'This message was deleted', file_url: null })
        .eq('id', req.params.id);

      // Notify socket
      const io = req.app.get('io');
      io.to(`conv:${msg.conversation_id}`).emit('message:deleted', {
        message_id: req.params.id,
        conversation_id: msg.conversation_id
      });
    } else {
      // Just mark deleted for this user (soft delete)
      await supabase.from('messages')
        .update({ is_deleted: true })
        .eq('id', req.params.id)
        .eq('sender_id', req.userId);
    }

    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
