import { useEffect, useState } from 'react';
import { getTickets, gradeTicket } from '../api/admin.api';

export function ManualReviewPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedOutcome, setSelectedOutcome] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTickets = () => {
    getTickets({ status: 'MANUAL_REVIEW' })
      .then((d: any) => setTickets(d.data))
      .catch(console.error);
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleGrade = async (ticketId: string) => {
    const outcome = selectedOutcome[ticketId];
    const reason = reasons[ticketId];
    if (!outcome || !reason || reason.length < 10) return;
    setLoading(true);
    try {
      await gradeTicket(ticketId, outcome, reason);
      setConfirmingId(null);
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to grade ticket');
    } finally {
      setLoading(false);
    }
  };

  const parseResultRaw = (raw: any) => {
    if (!raw) return null;
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return {
        homeScore: data.homeScore ?? data.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home')?.score ?? 'N/A',
        awayScore: data.awayScore ?? data.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away')?.score ?? 'N/A',
        completed: data.completed ?? data.status?.type?.completed ?? 'N/A',
        homeWinner: data.homeWinner ?? 'N/A',
        awayWinner: data.awayWinner ?? 'N/A',
      };
    } catch { return null; }
  };

  return (
    <div className="p-6">
      <h2 className="text-white font-semibold text-lg mb-4">
        Manual Review ({tickets.length} pending)
      </h2>
      {tickets.length === 0 && (
        <div className="bg-[#1a1a2e] border border-gray-800 rounded-lg p-8 text-center text-gray-500">
          No tickets pending manual review
        </div>
      )}
      <div className="space-y-4">
        {tickets.map((t: any) => {
          const match = t.quote?.selection?.market?.event?.match;
          const result = parseResultRaw(t.gradingRecord?.resultRaw);
          return (
            <div key={t.id} className="bg-[#1a1a2e] border border-gray-800 rounded-lg p-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-gray-400 text-xs">Ticket</p>
                  <p className="text-white font-mono text-sm">{t.id.slice(0, 8)}...{t.id.slice(-4)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">User</p>
                  <p className="text-white font-mono text-sm">{t.userId?.slice(0, 10)}...{t.userId?.slice(-4)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Match</p>
                  <p className="text-white">{match?.homeTeam} vs {match?.awayTeam}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Selection</p>
                  <p className="text-white">{t.quote?.selection?.name} @ {t.quote?.oddsAtQuote?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Stake</p>
                  <p className="text-white">${t.quote?.stake?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Expected Payout</p>
                  <p className="text-green-400">${t.quote?.expectedPayout?.toFixed(2)}</p>
                </div>
              </div>

              {result && (
                <div className="bg-[#2a2a3e] rounded p-3 mb-4">
                  <p className="text-gray-400 text-xs mb-2">ESPN Result Data</p>
                  <div className="grid grid-cols-5 gap-2 text-sm">
                    <div><span className="text-gray-500">Home Score:</span> <span className="text-white">{result.homeScore}</span></div>
                    <div><span className="text-gray-500">Away Score:</span> <span className="text-white">{result.awayScore}</span></div>
                    <div><span className="text-gray-500">Completed:</span> <span className="text-white">{String(result.completed)}</span></div>
                    <div><span className="text-gray-500">Home Winner:</span> <span className="text-white">{String(result.homeWinner)}</span></div>
                    <div><span className="text-gray-500">Away Winner:</span> <span className="text-white">{String(result.awayWinner)}</span></div>
                  </div>
                </div>
              )}

              {!result && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mb-4 text-orange-400 text-sm">
                  Result could not be determined automatically
                </div>
              )}

              <div className="flex gap-2 mb-3">
                {(['WIN', 'LOSS', 'VOID', 'REFUND'] as const).map((o) => (
                  <button key={o}
                    onClick={() => setSelectedOutcome((prev) => ({ ...prev, [t.id]: o }))}
                    className={`px-4 py-2 rounded text-sm font-medium border ${
                      selectedOutcome[t.id] === o
                        ? o === 'WIN' ? 'bg-green-600 border-green-500 text-white'
                          : o === 'LOSS' ? 'bg-red-600 border-red-500 text-white'
                          : o === 'VOID' ? 'bg-gray-600 border-gray-500 text-white'
                          : 'bg-cyan-600 border-cyan-500 text-white'
                        : 'border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}>
                    {o}
                  </button>
                ))}
              </div>

              <textarea
                placeholder="Reason (min 10 characters)..."
                value={reasons[t.id] || ''}
                onChange={(e) => setReasons((prev) => ({ ...prev, [t.id]: e.target.value }))}
                className="w-full bg-[#2a2a3e] border border-gray-600 rounded p-2 text-white text-sm mb-3 focus:outline-none focus:border-blue-500"
                rows={2}
              />

              {confirmingId === t.id ? (
                <div className="bg-[#2a2a3e] border border-blue-500/30 rounded p-3 mb-2">
                  <p className="text-white text-sm mb-2">
                    Confirm: Grade as <strong>{selectedOutcome[t.id]}</strong>
                    {selectedOutcome[t.id] === 'WIN' && ` — will pay $${t.quote?.expectedPayout?.toFixed(2)}`}
                    {selectedOutcome[t.id] === 'REFUND' && ` — will refund $${t.quote?.stake?.toFixed(2)}`}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => handleGrade(t.id)} disabled={loading}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                      {loading ? 'Processing...' : 'Confirm Decision'}
                    </button>
                    <button onClick={() => setConfirmingId(null)}
                      className="px-4 py-1.5 text-gray-400 text-sm hover:text-white">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingId(t.id)}
                  disabled={!selectedOutcome[t.id] || !reasons[t.id] || reasons[t.id].length < 10}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  Confirm Decision
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
