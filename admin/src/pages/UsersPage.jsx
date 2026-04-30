import { useEffect, useState } from 'react';
import { adminApi } from '../lib/adminApi';
import { formatDistanceToNow } from 'date-fns';
import { Search, UserX, UserCheck, RefreshCw, Eye } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const c = { active:'bg-green-900/40 text-green-400', blocked:'bg-red-900/40 text-red-400', pending:'bg-amber-900/40 text-amber-400' };
  return <span className={`text-xs px-2 py-0.5 rounded capitalize border border-transparent ${c[status] || 'text-gray-400'}`}>{status}</span>;
};

export default function UsersPage() {
  const [users,   setUsers]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('');
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState('');
  const [viewMsgs, setViewMsgs] = useState(null); // user being monitored
  const [msgs,    setMsgs]    = useState([]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filter) params.set('status', filter);
      const d = await adminApi(`/api/admin/users?${params}`);
      setUsers(d.users || []); setTotal(d.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const block = async (id, name) => {
    if (!confirm(`Block ${name}?`)) return;
    try { await adminApi(`/api/admin/users/${id}/block`, { method: 'PUT' }); showToast(`🚫 ${name} blocked`); load(); }
    catch (e) { showToast('Error: ' + e.message); }
  };

  const unblock = async (id, name) => {
    try { await adminApi(`/api/admin/users/${id}/unblock`, { method: 'PUT' }); showToast(`✅ ${name} unblocked`); load(); }
    catch (e) { showToast('Error: ' + e.message); }
  };

  const viewMessages = async (user) => {
    setViewMsgs(user);
    try { const d = await adminApi(`/api/admin/users/${user.id}/messages?limit=30`); setMsgs(d.messages || []); }
    catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-5 relative">
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Users</h1><p className="text-gray-400 text-sm mt-1">{total} total registered users</p></div>
        <button onClick={load} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search name, email, mobile..."
            className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600" />
        </div>
        <select value={filter} onChange={e => { setFilter(e.target.value); }}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-purple-500">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
        <button onClick={load} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium transition-colors">Search</button>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 uppercase border-b border-gray-800 bg-gray-800/50">
                <tr>
                  {['User','Mobile','Status','Online','Joined','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0">
                          {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" /> : u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{u.mobile}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-xs ${u.is_online ? 'text-green-400' : 'text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_online ? 'bg-green-400' : 'bg-gray-600'}`} />
                        {u.is_online ? 'Online' : u.last_seen ? formatDistanceToNow(new Date(u.last_seen), { addSuffix: true }) : 'Never'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => viewMessages(u)} title="View Messages"
                          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        {u.status === 'blocked'
                          ? <button onClick={() => unblock(u.id, u.name)} title="Unblock"
                              className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-900/20 rounded transition-colors">
                              <UserCheck className="w-4 h-4" />
                            </button>
                          : <button onClick={() => block(u.id, u.name)} title="Block"
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors">
                              <UserX className="w-4 h-4" />
                            </button>
                        }
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-600">No users found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monitor panel */}
      {viewMsgs && (
        <div className="fixed inset-0 z-40 flex items-center justify-end bg-black/50">
          <div className="bg-gray-900 border-l border-gray-700 h-full w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div>
                <p className="font-semibold text-white">Messages — {viewMsgs.name}</p>
                <p className="text-xs text-gray-400">{viewMsgs.email}</p>
              </div>
              <button onClick={() => setViewMsgs(null)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.length === 0 ? <p className="text-center text-gray-600 py-10">No messages</p> :
                msgs.map(m => (
                  <div key={m.id} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-purple-400">{m.conversation?.name || `Chat (${m.conversation?.type})`}</span>
                      <span className="text-xs text-gray-500">{new Date(m.created_at).toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-sm text-white">
                      {m.type === 'text' ? m.content : `[${m.type}${m.file_url ? ': ' + m.file_name : ''}]`}
                    </p>
                    {m.latitude && <p className="text-xs text-green-400 mt-1">📍 Location: {m.latitude}, {m.longitude}</p>}
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
