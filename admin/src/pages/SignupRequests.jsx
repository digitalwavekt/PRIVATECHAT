import { useEffect, useState } from 'react';
import { adminApi } from '../lib/adminApi';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

const STATUS_COLORS = {
  pending:  'bg-amber-900/40 text-amber-400 border-amber-700/40',
  approved: 'bg-green-900/40 text-green-400 border-green-700/40',
  rejected: 'bg-red-900/40 text-red-400 border-red-700/40',
};

export default function SignupRequests() {
  const [reqs,    setReqs]    = useState([]);
  const [tab,     setTab]     = useState('pending');
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState(null);
  const [reason,   setReason]   = useState('');
  const [toast,    setToast]    = useState('');

  const load = async () => {
    setLoading(true);
    try { const d = await adminApi(`/api/admin/signup-requests?status=${tab}`); setReqs(d.requests || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tab]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const approve = async (id, name) => {
    try {
      await adminApi(`/api/admin/signup-requests/${id}/approve`, { method: 'POST' });
      setReqs(prev => prev.filter(r => r.id !== id));
      showToast(`✅ ${name} approved — account created!`);
    } catch (e) { showToast('Error: ' + e.message); }
  };

  const reject = async () => {
    if (!rejectId) return;
    try {
      await adminApi(`/api/admin/signup-requests/${rejectId}/reject`, {
        method: 'POST', body: JSON.stringify({ reason })
      });
      setReqs(prev => prev.filter(r => r.id !== rejectId));
      setRejectId(null); setReason('');
      showToast('❌ Request rejected');
    } catch (e) { showToast('Error: ' + e.message); }
  };

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-xl text-sm">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Signup Requests</h1>
          <p className="text-gray-400 text-sm mt-1">Review and approve new user registrations</p>
        </div>
        <button onClick={load} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-0">
        {['pending','approved','rejected'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>{t}</button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : reqs.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No {tab} requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reqs.map(r => (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center text-lg font-bold flex-shrink-0">
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{r.name}</p>
                    <p className="text-sm text-gray-400">{r.email}</p>
                    <p className="text-sm text-gray-400">{r.mobile}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Requested {formatDistanceToNow(new Date(r.requested_at), { addSuffix: true })}
                    </p>
                    {r.rejection_reason && (
                      <p className="text-xs text-red-400 mt-1">Reason: {r.rejection_reason}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className={`text-xs px-2 py-1 rounded border capitalize ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => approve(r.id, r.name)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => { setRejectId(r.id); setReason(''); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-white mb-3">Reject Request</h3>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={reject}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors">
                Confirm Reject
              </button>
              <button onClick={() => setRejectId(null)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-semibold transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
