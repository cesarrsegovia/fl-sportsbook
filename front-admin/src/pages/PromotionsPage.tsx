import { useEffect, useState } from 'react';
import {
  activatePromotion,
  createPromotion,
  listPromotions,
  pausePromotion,
} from '../api/admin.api';

interface Promotion {
  id: string;
  type: 'FREE_BET' | 'ODDS_BOOST';
  code?: string | null;
  name: string;
  description: string;
  startsAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'DEPLETED';
  maxUses: number | null;
  usedCount: number;
  freeBetAmount?: number | null;
  selectionId?: string | null;
  boostedOdds?: number | null;
  originalOdds?: number | null;
  createdAt: string;
}

const statusClasses: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400',
  PAUSED: 'bg-yellow-500/20 text-yellow-400',
  EXPIRED: 'bg-gray-500/20 text-gray-400',
  DEPLETED: 'bg-red-500/20 text-red-400',
};

export function PromotionsPage() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    type: 'FREE_BET' as 'FREE_BET' | 'ODDS_BOOST',
    code: '',
    name: '',
    description: '',
    startsAt: new Date().toISOString().slice(0, 16),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    maxUses: '',
    freeBetAmount: '',
    selectionId: '',
    boostedOdds: '',
    originalOdds: '',
  });

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPromotions();
      setItems(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload: any = {
        type: form.type,
        code: form.code || undefined,
        name: form.name,
        description: form.description,
        startsAt: new Date(form.startsAt).toISOString(),
        expiresAt: new Date(form.expiresAt).toISOString(),
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      };
      if (form.type === 'FREE_BET') {
        payload.freeBetAmount = parseFloat(form.freeBetAmount);
      } else {
        payload.selectionId = form.selectionId;
        payload.boostedOdds = parseFloat(form.boostedOdds);
        payload.originalOdds = form.originalOdds
          ? parseFloat(form.originalOdds)
          : undefined;
      }
      await createPromotion(payload);
      setShowCreate(false);
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  const togglePause = async (p: Promotion) => {
    const reason = window.prompt('Reason:', 'Operator action') || 'Operator action';
    try {
      if (p.status === 'ACTIVE') await pausePromotion(p.id, reason);
      else if (p.status === 'PAUSED') await activatePromotion(p.id, reason);
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  return (
    <div className="p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Promotions</h2>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-bold"
        >
          {showCreate ? 'Cancel' : 'New Promotion'}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 px-3 py-2 rounded text-sm text-red-400">
          {error}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={submit}
          className="bg-[#1a1a2e] border border-gray-800 rounded-lg p-4 mb-6 grid grid-cols-2 gap-3 text-sm"
        >
          <label className="col-span-2">
            <span className="block text-xs uppercase text-gray-400 mb-1">Type</span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as any })}
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1"
            >
              <option value="FREE_BET">Free Bet</option>
              <option value="ODDS_BOOST">Odds Boost</option>
            </select>
          </label>
          <label>
            <span className="block text-xs uppercase text-gray-400 mb-1">Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1"
            />
          </label>
          <label>
            <span className="block text-xs uppercase text-gray-400 mb-1">Code (optional)</span>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1"
            />
          </label>
          <label className="col-span-2">
            <span className="block text-xs uppercase text-gray-400 mb-1">Description</span>
            <input
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1"
            />
          </label>
          <label>
            <span className="block text-xs uppercase text-gray-400 mb-1">Starts At</span>
            <input
              required
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1"
            />
          </label>
          <label>
            <span className="block text-xs uppercase text-gray-400 mb-1">Expires At</span>
            <input
              required
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1"
            />
          </label>
          <label>
            <span className="block text-xs uppercase text-gray-400 mb-1">Max Uses (blank = unlimited)</span>
            <input
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1"
            />
          </label>
          {form.type === 'FREE_BET' ? (
            <label>
              <span className="block text-xs uppercase text-gray-400 mb-1">Free Bet Amount (USD)</span>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={form.freeBetAmount}
                onChange={(e) => setForm({ ...form, freeBetAmount: e.target.value })}
                className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1"
              />
            </label>
          ) : (
            <>
              <label>
                <span className="block text-xs uppercase text-gray-400 mb-1">Selection ID</span>
                <input
                  required
                  value={form.selectionId}
                  onChange={(e) => setForm({ ...form, selectionId: e.target.value })}
                  className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1"
                />
              </label>
              <label>
                <span className="block text-xs uppercase text-gray-400 mb-1">Boosted Odds</span>
                <input
                  required
                  type="number"
                  min={1.01}
                  step="0.01"
                  value={form.boostedOdds}
                  onChange={(e) => setForm({ ...form, boostedOdds: e.target.value })}
                  className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1"
                />
              </label>
              <label>
                <span className="block text-xs uppercase text-gray-400 mb-1">Original Odds</span>
                <input
                  type="number"
                  min={1.01}
                  step="0.01"
                  value={form.originalOdds}
                  onChange={(e) => setForm({ ...form, originalOdds: e.target.value })}
                  className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1"
                />
              </label>
            </>
          )}
          <button
            type="submit"
            className="col-span-2 bg-blue-600 hover:bg-blue-700 rounded px-4 py-2 text-sm font-bold"
          >
            Create
          </button>
        </form>
      )}

      <div className="bg-[#1a1a2e] border border-gray-800 rounded-lg">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No promotions yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-black/30 text-xs uppercase text-gray-400">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Window</th>
                <th className="text-left px-3 py-2">Uses</th>
                <th className="text-left px-3 py-2">Details</th>
                <th className="text-left px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-gray-800">
                  <td className="px-3 py-2">
                    <div className="font-bold">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.description}</div>
                    {p.code && (
                      <div className="text-xs text-gray-400 mt-1">Code: {p.code}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">{p.type}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${statusClasses[p.status] ?? ''}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {new Date(p.startsAt).toLocaleDateString()} →{' '}
                    {new Date(p.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    {p.usedCount}
                    {p.maxUses ? ` / ${p.maxUses}` : ' / ∞'}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-400">
                    {p.type === 'FREE_BET'
                      ? `$${p.freeBetAmount?.toFixed(2) ?? '—'}`
                      : `${p.originalOdds ?? '?'} → ${p.boostedOdds ?? '?'}`}
                  </td>
                  <td className="px-3 py-2">
                    {(p.status === 'ACTIVE' || p.status === 'PAUSED') && (
                      <button
                        onClick={() => togglePause(p)}
                        className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded"
                      >
                        {p.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
