import { useEffect, useState } from 'react';
import { adminApi } from '../lib/adminApi';
import { Users, Clock, UserX, Wifi, MessageSquare, MessagesSquare, RefreshCw } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
    <p className="text-sm text-gray-400 mt-1">{label}</p>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const d = await adminApi('/api/admin/stats'); setStats(d); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">PrivaChat system overview</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users}         label="Active Users"    value={stats?.total_users}    color="bg-purple-600" />
        <StatCard icon={Clock}         label="Pending Approval" value={stats?.pending_users}  color="bg-amber-600"  />
        <StatCard icon={Wifi}          label="Online Now"      value={stats?.online_users}   color="bg-green-600"  />
        <StatCard icon={UserX}         label="Blocked Users"   value={stats?.blocked_users}  color="bg-red-600"    />
        <StatCard icon={MessageSquare} label="Total Messages"  value={stats?.total_messages} color="bg-blue-600"   />
        <StatCard icon={MessagesSquare}label="Total Chats"     value={stats?.total_chats}    color="bg-indigo-600" />
      </div>

      {stats?.pending_users > 0 && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-amber-300 font-semibold text-sm">{stats.pending_users} signup request{stats.pending_users > 1 ? 's' : ''} awaiting approval</p>
            <p className="text-amber-400/70 text-xs mt-0.5">Go to Signup Requests to review and approve them</p>
          </div>
          <a href="/requests" className="ml-auto px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap">
            Review Now
          </a>
        </div>
      )}
    </div>
  );
}
