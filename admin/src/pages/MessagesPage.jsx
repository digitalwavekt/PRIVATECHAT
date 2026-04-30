import { useEffect, useState } from 'react';
import { adminApi } from '../lib/adminApi';
import { Trash2, RefreshCw, Filter, MapPin } from 'lucide-react';

export default function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [filter,   setFilter]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const params = filter ? `?type=${filter}&limit=100` : '?limit=100';
      const d = await adminApi(`/api/admin/messages${params}`);
      setMessages(d.messages || []); setTotal(d.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const deleteMsg = async (id) => {
    if (!confirm('Remove this message for everyone?')) return;
    try {
      await adminApi(`/api/admin/messages/${id}`, { method: 'DELETE' });
      setMessages(prev => prev.filter(m => m.id !== id));
      showToast('✅ Message removed');
    } catch (e) { showToast('Error: ' + e.message); }
  };

  const TYPE_ICON = {
    text: '💬', image: '🖼️', video: '🎥', audio: '🎵', document: '📄', location: '📍'
  };

  return (
    <div className="space-y-5 relative">
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Messages</h1>
          <p className="text-gray-400 text-sm mt-1">Monitor and moderate all messages</p>
        </div>
        <button onClick={load} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        {['','text','image','video','audio','document','location'].map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === t ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>
            {t ? `${TYPE_ICON[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}` : 'All Types'}
          </button>
        ))}
      </div>

      {/* Messages table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 uppercase border-b border-gray-800 bg-gray-800/50">
                <tr>
                  {['Sender','Type','Content','Chat','Time','Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {messages.map(m => (
                  <tr key={m.id} className="border-t border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{m.sender?.name}</p>
                      <p className="text-xs text-gray-500">{m.sender?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-base">{TYPE_ICON[m.type] || '?'}</span>
                      <span className="text-xs text-gray-400 ml-1">{m.type}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {m.type === 'text'
                        ? <p className="text-gray-300 truncate">{m.content}</p>
                        : m.type === 'location'
                        ? <p className="text-green-400 text-xs"><MapPin className="w-3 h-3 inline" /> {m.latitude?.toFixed(4)}, {m.longitude?.toFixed(4)}</p>
                        : <a href={m.file_url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline truncate block">
                            {m.file_url ? 'View file' : '—'}
                          </a>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {m.conversation?.name || `${m.conversation?.type} chat`}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteMsg(m.id)} title="Remove message"
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {messages.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-600">No messages found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
