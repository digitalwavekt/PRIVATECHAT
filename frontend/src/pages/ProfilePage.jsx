import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, apiUpload } from '../lib/api';
import { ArrowLeft, Camera, Edit2, Save, LogOut, Users } from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({ name: user?.name || '', about: user?.about || '' });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const avatarRef = useRef(null);

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const data = await api('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(form)
      });
      updateUser(data.user);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const data = await apiUpload('/api/media/avatar', fd);
      updateUser({ avatar_url: data.url });
    } catch (err) {
      alert('Avatar upload failed: ' + err.message);
    }
    e.target.value = '';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a] bg-[#111]">
        <button onClick={() => navigate('/')} className="p-1 text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-white">Profile</h1>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-purple-700 flex items-center justify-center text-3xl font-bold overflow-hidden">
              {user?.avatar_url
                ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                : user?.name?.charAt(0).toUpperCase()
              }
            </div>
            <button
              onClick={() => avatarRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center border-2 border-[#0d0d0d] transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white">{user?.name}</p>
            <p className="text-sm text-gray-400">{user?.mobile}</p>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
            <span className="text-sm font-semibold text-gray-300">Profile Info</span>
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium"
            >
              {editing ? <Save className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
              {saving ? 'Saving...' : editing ? 'Save' : 'Edit'}
            </button>
          </div>

          {error && (
            <div className="px-4 py-2 bg-red-900/30 text-red-300 text-sm border-b border-[#2a2a2a]">
              {error}
            </div>
          )}

          {[
            { label: 'Name',   field: 'name',  value: user?.name,   editable: true  },
            { label: 'Email',  field: 'email', value: user?.email,  editable: false },
            { label: 'Mobile', field: 'mobile',value: user?.mobile, editable: false },
            { label: 'About',  field: 'about', value: user?.about,  editable: true  },
          ].map(item => (
            <div key={item.field} className="flex items-start gap-3 px-4 py-3 border-b border-[#2a2a2a] last:border-0">
              <span className="text-xs text-gray-500 w-14 pt-0.5 flex-shrink-0">{item.label}</span>
              {editing && item.editable ? (
                item.field === 'about' ? (
                  <textarea
                    value={form[item.field]}
                    onChange={e => setForm({ ...form, [item.field]: e.target.value })}
                    rows={2}
                    className="flex-1 bg-[#252525] border border-[#333] rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={form[item.field]}
                    onChange={e => setForm({ ...form, [item.field]: e.target.value })}
                    className="flex-1 bg-[#252525] border border-[#333] rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                )
              ) : (
                <span className="text-sm text-white flex-1">{item.value || '—'}</span>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/contacts')}
            className="w-full flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-xl transition-colors"
          >
            <Users className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-white">My Contacts</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] hover:bg-red-900/20 border border-[#2a2a2a] hover:border-red-700/50 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5 text-red-400" />
            <span className="text-sm font-medium text-red-400">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
