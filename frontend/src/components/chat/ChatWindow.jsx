import { useEffect, useState, useRef, useCallback } from 'react';
import { api, apiUpload } from '../../lib/api';
import MessageBubble  from './MessageBubble';
import MessageInput   from './MessageInput';
import ChatHeader     from './ChatHeader';

export default function ChatWindow({ conversation, currentUser, socket, typingUsers, onBack, onConvUpdate }) {
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [hasMore,  setHasMore]  = useState(true);
  const [replyTo,  setReplyTo]  = useState(null);
  const bottomRef = useRef(null);
  const listRef   = useRef(null);

  // Load initial messages
  const loadMessages = useCallback(async (before = null) => {
    try {
      const params = before ? `?before=${before}&limit=50` : '?limit=50';
      const data = await api(`/api/messages/${conversation.id}${params}`);
      const msgs = data.messages || [];
      if (before) {
        setMessages(prev => [...msgs, ...prev]);
      } else {
        setMessages(msgs);
        setHasMore(msgs.length === 50);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
      setHasMore(msgs.length === 50);
    } catch (err) {
      console.error('Load messages error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    setMessages([]);
    setLoading(true);
    loadMessages();
    // Mark as read
    api(`/api/conversations/${conversation.id}/read`, { method: 'PUT' }).catch(() => {});
    // Join socket room
    socket?.emit('conversation:join', conversation.id);
  }, [conversation.id]);

  // Load more (scroll to top)
  const loadMore = () => {
    if (!hasMore || messages.length === 0) return;
    const oldest = messages[0];
    loadMessages(oldest.created_at);
  };

  // Socket: incoming messages
  useEffect(() => {
    if (!socket) return;

    socket.on('message:new', ({ message, conversation_id }) => {
      if (conversation_id !== conversation.id) return;
      setMessages(prev => {
        if (prev.find(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      // Mark read
      socket.emit('message:read', { messageId: message.id, conversationId: conversation.id });
    });

    socket.on('message:deleted', ({ message_id }) => {
      setMessages(prev => prev.map(m =>
        m.id === message_id
          ? { ...m, deleted_for_everyone: true, content: 'This message was deleted', file_url: null }
          : m
      ));
    });

    socket.on('message:read', ({ messageId }) => {
      // Update read receipts if needed
    });

    return () => {
      socket.off('message:new');
      socket.off('message:deleted');
      socket.off('message:read');
    };
  }, [socket, conversation.id]);

  const handleSend = async ({ type, content, file, latitude, longitude, location_name, replyToId }) => {
    try {
      let payload = {
        conversation_id: conversation.id,
        type,
        content,
        reply_to_id: replyToId || null
      };

      // Upload file first if needed
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const uploadRes = await apiUpload('/api/media/upload', fd);
        payload = {
          ...payload,
          file_url:   uploadRes.url,
          file_name:  uploadRes.file_name,
          file_size:  uploadRes.file_size,
          file_mime:  uploadRes.file_mime
        };
      }

      // Location
      if (latitude) {
        payload = { ...payload, latitude, longitude, location_name };
      }

      await api('/api/messages', { method: 'POST', body: JSON.stringify(payload) });
      setReplyTo(null);
    } catch (err) {
      console.error('Send error:', err.message);
      alert('Failed to send: ' + err.message);
    }
  };

  const handleDelete = async (msgId, forEveryone) => {
    try {
      await api(`/api/messages/${msgId}`, {
        method: 'DELETE',
        body: JSON.stringify({ for_everyone: forEveryone })
      });
      if (!forEveryone) {
        setMessages(prev => prev.filter(m => m.id !== msgId));
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        conversation={conversation}
        currentUserId={currentUser.id}
        typingUsers={typingUsers}
        onBack={onBack}
      />

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {/* Load more */}
        {hasMore && !loading && (
          <button onClick={loadMore}
            className="w-full text-center text-xs text-gray-500 hover:text-gray-300 py-2">
            Load earlier messages
          </button>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 py-20">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Send the first message!</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === currentUser.id || msg.sender?.id === currentUser.id}
              showAvatar={
                conversation.type === 'group' &&
                (i === 0 || messages[i-1]?.sender_id !== msg.sender_id)
              }
              onReply={() => setReplyTo(msg)}
              onDelete={(forEveryone) => handleDelete(msg.id, forEveryone)}
            />
          ))
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-2">
            <div className="flex gap-1 bg-[#1e1e1e] px-3 py-2 rounded-2xl rounded-bl-sm">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 bg-gray-400 rounded-full typing-dot"
                  style={{ animationDelay: `${i*0.15}s` }} />
              ))}
            </div>
            <span className="text-xs text-gray-500">
              {typingUsers.map(t => t.name).join(', ')} typing...
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput
        conversationId={conversation.id}
        socket={socket}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={handleSend}
      />
    </div>
  );
}
