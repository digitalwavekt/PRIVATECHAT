import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('pc_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api('/api/auth/me')
        .then(d => setUser(d.user))
        .catch(() => { localStorage.removeItem('pc_token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('pc_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
    localStorage.removeItem('pc_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));

  return (
    <AuthCtx.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
