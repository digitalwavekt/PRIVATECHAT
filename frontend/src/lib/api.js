const BASE = import.meta.env.VITE_API_URL;

const getToken = () => localStorage.getItem('pc_token');

export const api = async (endpoint, options = {}) => {
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

export const apiUpload = async (endpoint, formData) => {
  const token = getToken();
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
};
