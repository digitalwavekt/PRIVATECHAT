import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../lib/adminApi';
import { Shield, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const data = await adminApi('/api/admin/login', { method: 'POST', body: JSON.stringify(form) });
      localStorage.setItem('pc_admin_token', data.token);
      navigate('/');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-600 rounded-2xl mb-4 shadow-lg shadow-purple-900/40">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400 text-sm mt-1">PrivaChat — Restricted Access</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {error && <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 mb-5 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  placeholder="admin@privachat.com" required />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="password" value={form.password} onChange={e => setForm({...form,password:e.target.value})}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  placeholder="••••••••" required />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Access Admin Panel
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
