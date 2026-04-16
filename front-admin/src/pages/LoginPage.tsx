import { useState } from 'react';
import { login } from '../api/auth.api';
import { useAdminStore } from '../store/useAdminStore';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAdminStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { accessToken } = await login(username, password);
      setAuth(accessToken, username);
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-[#1a1a2e] border border-gray-800 rounded-lg p-8 w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Sportsbook Admin
        </h1>
        {error && (
          <div className="bg-red-500/20 text-red-400 text-sm px-3 py-2 rounded mb-4">
            {error}
          </div>
        )}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-[#2a2a3e] border border-gray-700 rounded px-3 py-2 text-white text-sm mb-3 focus:outline-none focus:border-blue-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-[#2a2a3e] border border-gray-700 rounded px-3 py-2 text-white text-sm mb-4 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
