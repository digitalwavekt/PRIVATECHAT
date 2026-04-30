import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../lib/api';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow      from '../components/chat/ChatWindow';
import NewChatModal    from '../components/chat/NewChatModal';
import { MessageSquarePlus, Menu, X } from 'lucide-react';

export default function ChatLayout() {
  const { user, logout }  = useAuth();
  const { socket }        = useSocket();
  const navigate          = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConv,    setActiveConv]    = useState(null);
  const [showNewChat,   setShowNewChat]   = useState(false);
  const [showSidebar,   setShowSidebar]   = useState(true);
  const [typing,        setTyping]        = useState({}); // { convId: [{userId, name}] }

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const data = await api('/api/conversations');
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Load conv error:', err.message);
    }
  }, []);

  useEffect(() => { loadConversations(); }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    // New message in any conv
    socket.on('message:new', ({ message, conversation_id }) => {
      setConversations(prev => prev.map(c =>
        c.id === conversation_id
          ? { ...c,
              last_message:    message.type === 'text' ? message.content : `[${message.type}]`,
              last_message_at: message.created_at }
          : c
      ).sort((a,b) => new Date(b.last_message_at) - new Date(a.last_message_at)));
    });

    // Message deleted
    socket.on('message:deleted', ({ conversation_id }) => {});

    // New conversation created (group added me)
    socket.on('conversation:new', (conv) => {
      setConversations(prev => [conv, ...prev.filter(c => c.id !== conv.id)]);
    });

    // Typing
    socket.on('typing:start', ({ userId, name, conversationId }) => {
      setTyping(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []).filter(t => t.userId !== userId), { userId, name }]
      }));
    });
    socket.on('typing:stop', ({ userId, conversationId }) => {
      setTyping(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter(t => t.userId !== userId)
      }));
    });

    // Online status
    socket.on('user:online', ({ userId, is_online, last_seen }) => {
      setConversations(prev => prev.map(c => ({
        ...c,
        conversation_members: (c.conversation_members || []).map(m =>
          m.user_id === userId
            ? { ...m, user: { ...m.user, is_online, last_seen } }
            : m
        )
      })));
    });

    // Account blocked
    socket.on('account:blocked', ({ reason }) => {
      alert(`Your account has been blocked${reason ? ': ' + reason : ''}. You will be logged out.`);
      logout();
    });

    return () => {
      socket.off('message:new');
      socket.off('message:deleted');
      socket.off('conversation:new');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('user:online');
      socket.off('account:blocked');
    };
  }, [socket]);

  const handleSelectConv = (conv) => {
    setActiveConv(conv);
    if (window.innerWidth < 768) setShowSidebar(false);
  };

  const handleNewConv = (conv) => {
    setConversations(prev => [conv, ...prev.filter(c => c.id !== conv.id)]);
    setActiveConv(conv);
    setShowNewChat(false);
    if (window.innerWidth < 768) setShowSidebar(false);
  };

  return (
    <div className="flex h-screen bg-[#0d0d0d] overflow-hidden">
      {/* Sidebar */}
      <div className={`
        ${showSidebar ? 'flex' : 'hidden'} md:flex
        flex-col w-full md:w-80 lg:w-96
        border-r border-[#2a2a2a] bg-[#111]
        absolute md:relative z-20 h-full
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/profile')}>
              <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold overflow-hidden">
                {user?.avatar_url
                  ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                  : user?.name?.charAt(0).toUpperCase()
                }
              </div>
            </button>
            <span className="font-semibold text-white">PrivaChat</span>
          </div>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 hover:bg-[#222] rounded-lg transition-colors text-gray-400 hover:text-white"
            title="New Chat"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>
        </div>

        {/* Conversation list */}
        <ConversationList
          conversations={conversations}
          activeId={activeConv?.id}
          currentUserId={user?.id}
          typingMap={typing}
          onSelect={handleSelectConv}
        />
      </div>

      {/* Main chat area */}
      <div className={`
        ${!showSidebar ? 'flex' : 'hidden'} md:flex
        flex-1 flex-col
      `}>
        {activeConv ? (
          <ChatWindow
            key={activeConv.id}
            conversation={activeConv}
            currentUser={user}
            socket={socket}
            typingUsers={typing[activeConv.id] || []}
            onBack={() => setShowSidebar(true)}
            onConvUpdate={(updated) => {
              setActiveConv(updated);
              setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-4">
            <div className="w-20 h-20 bg-[#1a1a1a] rounded-full flex items-center justify-center">
              <MessageSquarePlus className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-500">Select a chat or start a new one</p>
            <button
              onClick={() => setShowNewChat(true)}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              New Chat
            </button>
          </div>
        )}
      </div>

      {/* Mobile back button overlay */}
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="md:hidden fixed bottom-5 left-5 z-30 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center shadow-lg"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <NewChatModal
          currentUserId={user?.id}
          onClose={() => setShowNewChat(false)}
          onCreated={handleNewConv}
        />
      )}
    </div>
  );
}
