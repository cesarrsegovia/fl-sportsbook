import { useEffect, useState } from 'react';
import {
  activatePromotion,
  listPromotions,
  pausePromotion,
} from '../api/admin.api';
import { CreatePromotionForm } from '../components/CreatePromotionForm';

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
        <CreatePromotionForm
          onSuccess={() => {
            setShowCreate(false);
            fetchAll();
          }}
          onCancel={() => setShowCreate(false)}
          onError={setError}
        />
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
