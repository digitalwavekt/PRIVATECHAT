import { useEffect, useState } from 'react';
import { adminApi } from '../lib/adminApi';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, ScrollText } from 'lucide-react';

const ACTION_COLORS = {
  approve_user:   'bg-green-900/40 text-green-400',
  reject_user:    'bg-red-900/40 text-red-400',
  block_user:     'bg-red-900/40 text-red-400',
  unblock_user:   'bg-blue-900/40 text-blue-400',
  delete_message: 'bg-amber-900/40 text-amber-400',
};

export default function LogsPage() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const d = await adminApi('/api/admin/logs'); setLogs(d.logs || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Audit Logs</h1><p className="text-gray-400 text-sm mt-1">All admin actions recorded here</p></div>
        <button onClick={load} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No logs yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-800/30 transition-colors">
                <div className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap ${ACTION_COLORS[log.action] || 'bg-gray-800 text-gray-400'}`}>
                  {log.action.replace(/_/g,' ')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    <span className="font-medium text-purple-400">{log.admin?.name || 'Admin'}</span>
                    {' → '}
                    {log.action.replace(/_/g,' ')}
                    {log.details?.email && <span className="text-gray-300"> ({log.details.email})</span>}
                    {log.details?.reason && <span className="text-gray-400"> — {log.details.reason}</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{log.admin?.email}</p>
                </div>
                <p className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
