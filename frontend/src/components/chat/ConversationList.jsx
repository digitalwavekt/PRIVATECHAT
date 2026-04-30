import { formatDistanceToNow } from 'date-fns';

const getOtherMember = (conv, currentUserId) => {
  if (conv.type !== 'direct') return null;
  const other = (conv.conversation_members || []).find(m => m.user_id !== currentUserId);
  return other?.user || null;
};

const getDisplayName = (conv, currentUserId) => {
  if (conv.type === 'group') return conv.name || 'Group';
  const other = getOtherMember(conv, currentUserId);
  return other?.name || 'Unknown';
};

const getAvatar = (conv, currentUserId) => {
  if (conv.type === 'group') return conv.avatar_url || null;
  const other = getOtherMember(conv, currentUserId);
  return other?.avatar_url || null;
};

const isOnline = (conv, currentUserId) => {
  if (conv.type !== 'direct') return false;
  const other = getOtherMember(conv, currentUserId);
  return other?.is_online || false;
};

const AvatarCircle = ({ name, url, online, size = 'md' }) => {
  const sz = size === 'md' ? 'w-11 h-11' : 'w-9 h-9';
  return (
    <div className={`relative flex-shrink-0 ${sz} rounded-full bg-purple-700 flex items-center justify-center font-semibold text-white overflow-hidden`}>
      {url ? <img src={url} className="w-full h-full object-cover" alt="" /> : name?.charAt(0).toUpperCase()}
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#111] online-pulse" />
      )}
    </div>
  );
};

export default function ConversationList({ conversations, activeId, currentUserId, typingMap, onSelect }) {
  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm">
          <p>No chats yet</p>
          <p className="text-xs mt-1">Start a new conversation</p>
        </div>
      )}
      {conversations.map(conv => {
        const name    = getDisplayName(conv, currentUserId);
        const avatar  = getAvatar(conv, currentUserId);
        const online  = isOnline(conv, currentUserId);
        const typing  = typingMap?.[conv.id] || [];
        const isActive = conv.id === activeId;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors text-left border-b border-[#1e1e1e] ${
              isActive ? 'bg-[#1e1a2e] border-l-2 border-l-purple-500' : ''
            }`}
          >
            <AvatarCircle name={name} url={avatar} online={online} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white truncate">{name}</span>
                {conv.last_message_at && (
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-gray-500 truncate">
                  {typing.length > 0
                    ? <span className="text-purple-400 italic">
                        {typing.map(t => t.name).join(', ')} typing...
                      </span>
                    : (conv.last_message || 'No messages yet')
                  }
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
