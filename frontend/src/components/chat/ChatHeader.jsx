import { useState } from 'react';
import { ArrowLeft, MoreVertical, Phone, Video, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const getOtherMember = (conv, uid) =>
  (conv.conversation_members || []).find(m => m.user_id !== uid)?.user;

export default function ChatHeader({ conversation, currentUserId, typingUsers, onBack }) {
  const [showInfo, setShowInfo] = useState(false);

  const isDirect = conversation.type === 'direct';
  const other    = isDirect ? getOtherMember(conversation, currentUserId) : null;
  const name     = isDirect ? (other?.name || 'Unknown') : (conversation.name || 'Group');
  const avatar   = isDirect ? other?.avatar_url : conversation.avatar_url;
  const online   = isDirect ? other?.is_online : false;
  const lastSeen = isDirect ? other?.last_seen : null;
  const members  = conversation.conversation_members || [];

  const statusText = () => {
    if (typingUsers.length > 0) return 'typing...';
    if (isDirect) {
      if (online) return 'Online';
      if (lastSeen) return `Last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`;
    } else {
      return `${members.length} members`;
    }
    return '';
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a] bg-[#111]">
      {/* Back button (mobile) */}
      <button onClick={onBack} className="md:hidden p-1 text-gray-400 hover:text-white">
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Avatar */}
      <div className="relative flex-shrink-0 w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center font-semibold text-sm overflow-hidden">
        {avatar
          ? <img src={avatar} className="w-full h-full object-cover" alt="" />
          : name.charAt(0).toUpperCase()
        }
        {online && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#111]" />
        )}
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{name}</p>
        <p className={`text-xs truncate ${typingUsers.length > 0 ? 'text-purple-400' : 'text-gray-500'}`}>
          {statusText()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {isDirect && (
          <>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded-lg transition-colors">
              <Phone className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded-lg transition-colors">
              <Video className="w-4 h-4" />
            </button>
          </>
        )}
        {!isDirect && (
          <button className="p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded-lg transition-colors">
            <Users className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded-lg transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Info panel dropdown */}
      {showInfo && !isDirect && (
        <div className="absolute top-14 right-4 bg-[#1e1e1e] border border-[#333] rounded-xl p-3 shadow-xl z-30 w-56">
          <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">Members</p>
          {members.map(m => (
            <div key={m.user_id} className="flex items-center gap-2 py-1.5">
              <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center text-xs font-bold overflow-hidden">
                {m.user?.avatar_url
                  ? <img src={m.user.avatar_url} className="w-full h-full object-cover" alt="" />
                  : m.user?.name?.charAt(0)
                }
              </div>
              <div>
                <p className="text-xs text-white font-medium">{m.user?.name}</p>
                {m.role === 'admin' && <p className="text-xs text-purple-400">Admin</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
