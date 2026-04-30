// backend/src/sockets/chatSocket.js
const jwt      = require('jsonwebtoken');
const supabase = require('../services/supabase');

module.exports = (io) => {

  // ── Auth middleware for sockets ──────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userName = decoded.name;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`🔌 User connected: ${socket.userName} (${userId})`);

    // ── Join personal room ─────────────────────────────────
    socket.join(`user:${userId}`);

    // ── Update online status ───────────────────────────────
    await supabase.from('users')
      .update({ is_online: true, last_seen: new Date() })
      .eq('id', userId);

    // ── Notify contacts user is online ─────────────────────
    const { data: contacts } = await supabase
      .from('contacts')
      .select('contact_id')
      .eq('user_id', userId);

    (contacts || []).forEach(c => {
      io.to(`user:${c.contact_id}`).emit('user:online', { userId, is_online: true });
    });

    // ── Join all my conversation rooms ─────────────────────
    const { data: memberships } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);

    (memberships || []).forEach(m => {
      socket.join(`conv:${m.conversation_id}`);
    });

    // ── JOIN CONVERSATION ──────────────────────────────────
    socket.on('conversation:join', (conversationId) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    // ── TYPING INDICATORS ─────────────────────────────────
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing:start', {
        userId,
        name: socket.userName,
        conversationId
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing:stop', {
        userId,
        conversationId
      });
    });

    // ── MESSAGE READ ───────────────────────────────────────
    socket.on('message:read', async ({ messageId, conversationId }) => {
      try {
        await supabase.from('message_receipts').upsert({
          message_id: messageId,
          user_id:    userId,
          status:     'read',
          read_at:    new Date()
        }, { onConflict: 'message_id,user_id' });

        // Update last_read_at for conversation
        await supabase.from('conversation_members')
          .update({ last_read_at: new Date() })
          .eq('conversation_id', conversationId)
          .eq('user_id', userId);

        socket.to(`conv:${conversationId}`).emit('message:read', {
          messageId,
          userId,
          conversationId
        });
      } catch (err) {
        console.error('Read receipt error:', err.message);
      }
    });

    // ── LOCATION SHARE (live) ─────────────────────────────
    socket.on('location:share', ({ conversationId, latitude, longitude, location_name }) => {
      socket.to(`conv:${conversationId}`).emit('location:update', {
        userId,
        name: socket.userName,
        latitude,
        longitude,
        location_name,
        conversationId,
        timestamp: new Date()
      });
    });

    // ── CALL SIGNALING (WebRTC) ───────────────────────────
    socket.on('call:offer', ({ to, offer, callType }) => {
      io.to(`user:${to}`).emit('call:incoming', {
        from:     userId,
        fromName: socket.userName,
        offer,
        callType  // 'audio' or 'video'
      });
    });

    socket.on('call:answer', ({ to, answer }) => {
      io.to(`user:${to}`).emit('call:answered', { from: userId, answer });
    });

    socket.on('call:ice-candidate', ({ to, candidate }) => {
      io.to(`user:${to}`).emit('call:ice-candidate', { from: userId, candidate });
    });

    socket.on('call:reject', ({ to }) => {
      io.to(`user:${to}`).emit('call:rejected', { from: userId });
    });

    socket.on('call:end', ({ to }) => {
      io.to(`user:${to}`).emit('call:ended', { from: userId });
    });

    // ── DISCONNECT ─────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.userName}`);

      await supabase.from('users')
        .update({ is_online: false, last_seen: new Date() })
        .eq('id', userId);

      // Notify contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('contact_id')
        .eq('user_id', userId);

      (contacts || []).forEach(c => {
        io.to(`user:${c.contact_id}`).emit('user:online', {
          userId,
          is_online: false,
          last_seen: new Date()
        });
      });
    });
  });
};
