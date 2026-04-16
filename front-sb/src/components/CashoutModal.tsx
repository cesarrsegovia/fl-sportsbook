import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:3000';
const COUNTDOWN_SECONDS = 10;

function tryParseJson(str: string | undefined): any {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

interface CashoutQuote {
  ticketId: string;
  cashoutAmount: number;
  currentOdds: number;
  oddsAtBet: number;
  expiresAt: string;
}

interface Props {
  ticketId: string;
  userId: string;
  stake: number;
  potentialPayout: number;
  onClose: () => void;
  onCashedOut: () => void;
}

export default function CashoutModal({
  ticketId,
  userId,
  stake,
  potentialPayout,
  onClose,
  onCashedOut,
}: Props) {
  const [quote, setQuote] = useState<CashoutQuote | null>(null);
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${API_URL}/tickets/${ticketId}/cashout-quote`,
        { params: { userId } },
      );
      setQuote(res.data);
      setRemaining(COUNTDOWN_SECONDS);
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Unable to get cashout quote');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [ticketId]);

  useEffect(() => {
    if (!quote) return;
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [quote, remaining]);

  const confirm = async () => {
    if (!quote) return;
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(`${API_URL}/tickets/${ticketId}/cashout`, {
        userId,
        expectedAmount: quote.cashoutAmount,
      });
      onCashedOut();
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Cashout failed';
      const errorData = tryParseJson(msg);
      if (errorData?.code === 'CASHOUT_AMOUNT_CHANGED') {
        setQuote(q => q ? { ...q, cashoutAmount: errorData.newAmount } : q);
        setRemaining(COUNTDOWN_SECONDS);
        setError(`Cashout amount changed to $${errorData.newAmount.toFixed(2)} — review and confirm again.`);
      } else {
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const expired = quote && remaining === 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black italic text-xl uppercase tracking-tight text-on-surface">Cash Out</h3>
          <button onClick={onClose} className="p-1 text-on-surface-variant hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {loading && !quote && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {quote && (
          <>
            <div className="bg-black/40 rounded-xl p-4 mb-4">
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Cash out now for</p>
              <p className="font-black text-4xl text-emerald-300 text-glow-tertiary">
                ${quote.cashoutAmount.toFixed(2)}
              </p>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-outline-variant/10 text-xs">
                <div>
                  <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">Original Stake</p>
                  <p className="font-black text-on-surface">${stake.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">Potential Win</p>
                  <p className="font-black text-on-surface">${potentialPayout.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">Odds at Bet</p>
                  <p className="font-black text-on-surface">{quote.oddsAtBet.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">Current Odds</p>
                  <p className="font-black text-on-surface">{quote.currentOdds.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="text-on-surface-variant">Expires in</span>
                <span className={`font-black ${remaining <= 3 ? 'text-red-400' : 'text-on-surface'}`}>
                  {remaining}s
                </span>
              </div>
              <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${remaining <= 3 ? 'bg-red-500' : 'bg-secondary'}`}
                  style={{ width: `${(remaining / COUNTDOWN_SECONDS) * 100}%` }}
                />
              </div>
            </div>

            {error && (
              <div className="mb-3 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-surface-container-high text-on-surface-variant font-black rounded-xl uppercase text-sm"
              >
                Cancel
              </button>
              {expired ? (
                <button
                  onClick={fetchQuote}
                  className="flex-1 py-3 bg-secondary text-on-secondary font-black rounded-xl uppercase text-sm"
                >
                  Refresh Quote
                </button>
              ) : (
                <button
                  onClick={confirm}
                  disabled={submitting}
                  className="flex-1 py-3 bg-emerald-500 text-white font-black rounded-xl uppercase text-sm disabled:opacity-50"
                >
                  {submitting ? 'Cashing out…' : 'Confirm Cashout'}
                </button>
              )}
            </div>
          </>
        )}

        {error && !quote && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
