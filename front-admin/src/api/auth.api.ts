import axios from 'axios';

const API_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3005';

export async function login(username: string, password: string) {
  const res = await axios.post(`${API_URL}/auth/login`, { username, password });
  return res.data as { accessToken: string; expiresAt: string };
}
