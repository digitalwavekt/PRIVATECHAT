const BASE = import.meta.env.VITE_API_URL;
const getToken = () => localStorage.getItem('pc_admin_token');

export const adminApi = async (endpoint, options = {}) => {
  const token = getToken();
  const res = await fetch(`${BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};
