import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, UserPlus, Search, Edit2, Trash2, MessageCircle, X, Check } from 'lucide-react';

export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts,  setContacts]  = useState([]);
  const [search,    setSearch]    = useState('');
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [editName,  setEditName]  = useState('');
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    try {
      const data = await api('/api/users/contacts');
      setContacts(data.contacts || []);
    } catch {}
    finally { setLoading(false); }
  };

  const searchUsers = async (q) => {
    setSearch(q);
    if (!q || q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await api(`/api/users/search?q=${encodeURIComponent(q)}`);
      setResults(data.users || []);
    } catch {}
    finally { setSearching(false); }
  };

  const addContact = async (user) => {
    try {
      await api('/api/users/contacts', {
        method: 'POST',
        body: JSON.stringify({ contact_id: user.id, saved_name: user.name })
      });
      setSearch(''); setResults([]);
      loadContacts();
    } catch (err) { alert(err.message); }
  };

  const renameContact = async (contactId) => {
    if (!editName.trim()) return;
    try {
      await api(`/api/users/contacts/${contactId}`, {
        method: 'PUT',
        body: JSON.stringify({ saved_name: editName.trim() })
      });
      setContacts(prev => prev.map(c =>
        c.contact.id === contactId ? { ...c, saved_name: editName.trim() } : c
      ));
      setEditId(null);
    } catch (err) { alert(err.message); }
  };

  const removeContact = async (contactId) => {
    if (!confirm('Remove this contact?')) return;
    try {
      await api(`/api/users/contacts/${contactId}`, { method: 'DELETE' });
      setContacts(prev => prev.filter(c => c.contact.id !== contactId));
    } catch (err) { alert(err.message); }
  };

  const startChat = async (contactId) => {
    try {
      const data = await api('/api/conversations/direct', {
        method: 'POST',
        body: JSON.stringify({ user_id: contactId })
      });
      navigate('/');
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a] bg-[#111]">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-white">Contacts</h1>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Search to add */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => searchUsers(e.target.value)}
            placeholder="Search users to add..."
            className="w-full pl-9 pr-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600"
          />
          {search && (
            <button onClick={() => { setSearch(''); setResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search results */}
        {results.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <p className="text-xs text-gray-500 px-4 py-2 border-b border-[#2a2a2a] font-medium">Search Results</p>
            {results.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e1e] last:border-0">
                <div className="w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                  {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" /> : u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.mobile}</p>
                </div>
                <button onClick={() => addContact(u)}
                  className="p-1.5 text-purple-400 hover:bg-purple-900/30 rounded-lg transition-colors">
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* My contacts */}
        <div>
          <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wide">
            My Contacts ({contacts.length})
          </p>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-10 text-gray-600 text-sm">
              <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No contacts yet. Search users above to add them.
            </div>
          ) : (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
              {contacts.map(({ id, saved_name, contact }) => (
                <div key={id} className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e1e] last:border-0">
                  <div className="relative w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                    {contact?.avatar_url
                      ? <img src={contact.avatar_url} className="w-full h-full object-cover" alt="" />
                      : (saved_name || contact?.name)?.charAt(0).toUpperCase()
                    }
                    {contact?.is_online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1a1a1a]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {editId === contact?.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="flex-1 bg-[#252525] border border-[#444] rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:border-purple-500"
                          autoFocus
                        />
                        <button onClick={() => renameContact(contact.id)} className="text-green-400 hover:text-green-300">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditId(null)} className="text-gray-500 hover:text-gray-300">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-white">{saved_name || contact?.name}</p>
                        {saved_name && saved_name !== contact?.name && (
                          <p className="text-xs text-gray-500">{contact?.name}</p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={() => startChat(contact?.id)}
                      className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 rounded-lg transition-colors">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setEditId(contact?.id); setEditName(saved_name || contact?.name || ''); }}
                      className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-900/20 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeContact(contact?.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
