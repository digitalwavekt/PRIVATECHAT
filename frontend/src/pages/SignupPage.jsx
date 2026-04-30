import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { MessageCircle, User, Phone, Mail, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function SignupPage() {
  const [form, setForm]     = useState({ name: '', mobile: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api('/api/auth/request-signup', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-900/30 rounded-full mb-5">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Request Submitted!</h1>
        <p className="text-gray-400 mb-2">
          Your signup request has been sent to the admin for review.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          You'll be notified once approved. This usually takes 24–48 hours.
        </p>
        <Link to="/login"
          className="inline-block px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors">
          Back to Login
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4 shadow-lg shadow-purple-900/40">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Request Access</h1>
          <p className="text-gray-400 text-sm mt-1">Admin approval required to join</p>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#2a2a2a]">
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 mb-5 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'name',     label: 'Full Name',    icon: User,  type: 'text',     ph: 'Your full name' },
              { key: 'mobile',   label: 'Mobile Number',icon: Phone, type: 'tel',      ph: '+91 98765 43210' },
              { key: 'email',    label: 'Email',        icon: Mail,  type: 'email',    ph: 'you@email.com' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">{f.label}</label>
                <div className="relative">
                  <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={f.type}
                    value={form[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#252525] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600"
                    placeholder={f.ph}
                    required
                  />
                </div>
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-10 pr-10 py-2.5 bg-[#252525] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  placeholder="Min 6 characters"
                  required minLength={6}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Submit Request
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have access?{' '}
            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
