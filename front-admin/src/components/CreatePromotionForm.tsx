import { useState } from 'react';
import { createPromotion } from '../api/admin.api';

interface CreatePromotionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}

export function CreatePromotionForm({ onSuccess, onCancel, onError }: CreatePromotionFormProps) {
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
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
      onSuccess();
    } catch (e: any) {
      onError(e?.response?.data?.message || e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="bg-[#1a1a2e] border border-gray-800 rounded-lg p-4 mb-6 grid grid-cols-2 gap-3 text-sm"
    >
      <label className="col-span-2">
        <span className="block text-xs uppercase text-gray-400 mb-1">Type</span>
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as any })}
          className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-white"
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
          className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-white"
        />
      </label>
      <label>
        <span className="block text-xs uppercase text-gray-400 mb-1">Code (optional)</span>
        <input
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-white"
        />
      </label>
      <label className="col-span-2">
        <span className="block text-xs uppercase text-gray-400 mb-1">Description</span>
        <input
          required
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-white"
        />
      </label>
      <label>
        <span className="block text-xs uppercase text-gray-400 mb-1">Starts At</span>
        <input
          required
          type="datetime-local"
          value={form.startsAt}
          onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-white"
        />
      </label>
      <label>
        <span className="block text-xs uppercase text-gray-400 mb-1">Expires At</span>
        <input
          required
          type="datetime-local"
          value={form.expiresAt}
          onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-white"
        />
      </label>
      <label>
        <span className="block text-xs uppercase text-gray-400 mb-1">Max Uses (blank = unlimited)</span>
        <input
          type="number"
          min={1}
          value={form.maxUses}
          onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
          className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-white"
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
            className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-white"
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
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-white"
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
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-white"
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
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-white"
            />
          </label>
        </>
      )}
      <div className="col-span-2 flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded px-4 py-2 text-sm font-bold text-white"
        >
          {isSubmitting ? 'Creating...' : 'Create'}
        </button>
      </div>
    </form>
  );
}
