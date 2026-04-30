import { useState } from 'react';
import { api } from '../../lib/api';
import { Search, Users, X, Check } from 'lucide-react';

export default function NewChatModal({ currentUserId, onClose, onCreated }) {
  const [tab,      setTab]     = useState('direct'); // direct | group
  const [query,    setQuery]   = useState('');
  const [results,  setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loading,  setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const search = async (q) => {
    setQuery(q);
    if (!q || q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await api(`/api/users/search?q=${encodeURIComponent(q)}`);
      setResults(data.users || []);
    } catch {}
    finally { setSearching(false); }
  };

  const toggleSelect = (user) => {
    setSelected(prev =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  const startDirect = async (userId) => {
    setLoading(true);
    try {
      const data = await api('/api/conversations/direct', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId })
      });
      onCreated(data.conversation);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selected.length < 1) return;
    setLoading(true);
    try {
      const data = await api('/api/conversations/group', {
        method: 'POST',
        body: JSON.stringify({
          name:       groupName.trim(),
          member_ids: selected.map(u => u.id)
        })
      });
      onCreated(data.conversation);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <h2 className="font-semibold text-white">New Chat</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2a2a2a]">
          {['direct', 'group'].map(t => (
            <button key={t} onClick={() => { setTab(t); setSelected([]); setResults([]); setQuery(''); }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? 'text-purple-400 border-b-2 border-purple-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}>
              {t === 'direct' ? 'Direct Message' : 'Create Group'}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {/* Group name input */}
          {tab === 'group' && (
            <input
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Group name..."
              className="w-full px-3 py-2 bg-[#252525] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600"
            />
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={e => search(e.target.value)}
              placeholder="Search by name, mobile, or email..."
              className="w-full pl-9 pr-4 py-2 bg-[#252525] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600"
            />
          </div>

          {/* Selected chips for group */}
          {tab === 'group' && selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map(u => (
                <span key={u.id}
                  className="flex items-center gap-1.5 text-xs bg-purple-900/40 text-purple-300 border border-purple-700/50 px-2 py-1 rounded-full">
                  {u.name}
                  <button onClick={() => toggleSelect(u)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Results */}
          <div className="max-h-52 overflow-y-auto space-y-1">
            {searching && (
              <div className="text-center py-4">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}
            {!searching && results.map(user => {
              const isChosen = selected.find(u => u.id === user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => tab === 'direct' ? startDirect(user.id) : toggleSelect(user)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#252525] rounded-lg transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                    {user.avatar_url
                      ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                      : user.name.charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.mobile}</p>
                  </div>
                  {tab === 'group' && isChosen && (
                    <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  )}
                  {user.is_online && (
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
            {!searching && query.length >= 2 && results.length === 0 && (
              <p className="text-center text-sm text-gray-600 py-4">No users found</p>
            )}
          </div>

          {/* Create group button */}
          {tab === 'group' && (
            <button
              onClick={createGroup}
              disabled={!groupName.trim() || selected.length < 1 || loading}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Users className="w-4 h-4" /> Create Group ({selected.length} members)</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
