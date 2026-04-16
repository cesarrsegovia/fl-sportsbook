import { useEffect, useState } from 'react';
import { getTickets, getTicket } from '../api/admin.api';
import { StatusBadge } from '../components/StatusBadge';

export function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [detail, setDetail] = useState<any>(null);

  const fetchTickets = () => {
    const params: Record<string, string> = { page: String(page), limit: '50' };
    if (statusFilter) params.status = statusFilter;
    if (userIdFilter) params.userId = userIdFilter;
    getTickets(params)
      .then((d: any) => { setTickets(d.data); setTotal(d.total); })
      .catch(console.error);
  };

  useEffect(() => { fetchTickets(); }, [page, statusFilter, userIdFilter]);

  const openDetail = async (ticketId: string) => {
    const t = await getTicket(ticketId);
    setDetail(t);
  };

  const truncate = (s: string) => s ? `${s.slice(0, 8)}...${s.slice(-4)}` : '';

  return (
    <div className="p-6 flex gap-4">
      <div className="flex-1">
        <h2 className="text-white font-semibold text-lg mb-4">Tickets</h2>
        <div className="flex gap-3 mb-4">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-[#2a2a3e] border border-gray-700 rounded px-3 py-1.5 text-white text-sm">
            <option value="">All Status</option>
            {['CONFIRMED','MANUAL_REVIEW','SETTLEMENT_FAILED','WON','LOST','VOID','REFUNDED','SETTLING','SETTLED','SUBMITTED'].map(s =>
              <option key={s} value={s}>{s}</option>
            )}
          </select>
          <input placeholder="Wallet address..." value={userIdFilter}
            onChange={(e) => { setUserIdFilter(e.target.value); setPage(1); }}
            className="bg-[#2a2a3e] border border-gray-700 rounded px-3 py-1.5 text-white text-sm w-60" />
        </div>
        <div className="bg-[#1a1a2e] border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-4 py-3">Ticket</th>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Match</th>
                <th className="text-left px-4 py-3">Selection</th>
                <th className="text-right px-4 py-3">Stake</th>
                <th className="text-right px-4 py-3">Odds</th>
                <th className="text-right px-4 py-3">Payout</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 && (
                <tr><td colSpan={8} className="text-gray-500 text-center py-8">No tickets found</td></tr>
              )}
              {tickets.map((t: any) => (
                <tr key={t.id} onClick={() => openDetail(t.id)}
                  className="border-b border-gray-800/50 text-white cursor-pointer hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs">{truncate(t.id)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{truncate(t.userId)}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {t.quote?.selection?.market?.event?.match?.homeTeam} vs {t.quote?.selection?.market?.event?.match?.awayTeam}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{t.quote?.selection?.name}</td>
                  <td className="px-4 py-3 text-right">${t.quote?.stake?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{t.quote?.oddsAtQuote?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-green-400">${t.quote?.expectedPayout?.toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
          <span>{total} tickets total</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="px-3 py-1 bg-[#2a2a3e] rounded disabled:opacity-30">Prev</button>
            <span className="px-3 py-1">Page {page}</span>
            <button disabled={tickets.length < 50} onClick={() => setPage(page + 1)}
              className="px-3 py-1 bg-[#2a2a3e] rounded disabled:opacity-30">Next</button>
          </div>
        </div>
      </div>

      {detail && (
        <div className="w-96 bg-[#1a1a2e] border border-gray-800 rounded-lg p-4 h-fit sticky top-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold">Ticket Detail</h3>
            <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-white text-sm">Close</button>
          </div>
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-400">ID:</span> <span className="text-white font-mono text-xs">{detail.id}</span></div>
            <div><span className="text-gray-400">User:</span> <span className="text-white font-mono text-xs">{detail.userId}</span></div>
            <div><span className="text-gray-400">Status:</span> <StatusBadge status={detail.status} /></div>
            <div><span className="text-gray-400">Stake:</span> <span className="text-white">${detail.quote?.stake?.toFixed(2)}</span></div>
            <div><span className="text-gray-400">Odds:</span> <span className="text-white">{detail.quote?.oddsAtQuote?.toFixed(2)}</span></div>
            <div><span className="text-gray-400">Payout:</span> <span className="text-green-400">${detail.quote?.expectedPayout?.toFixed(2)}</span></div>
            <div><span className="text-gray-400">TxHash:</span> <span className="text-white font-mono text-xs">{detail.txHash || 'N/A'}</span></div>
            <div><span className="text-gray-400">Created:</span> <span className="text-white">{new Date(detail.createdAt).toLocaleString()}</span></div>
            {detail.gradingRecord && (
              <div className="border-t border-gray-700 pt-3">
                <p className="text-gray-400 mb-1">Grading Record</p>
                <div><span className="text-gray-500">Outcome:</span> <StatusBadge status={detail.gradingRecord.outcome} /></div>
                <div><span className="text-gray-500">Source:</span> <span className="text-white">{detail.gradingRecord.resultSource}</span></div>
                <div><span className="text-gray-500">Graded by:</span> <span className="text-white">{detail.gradingRecord.gradedBy}</span></div>
              </div>
            )}
            {detail.settlementJob && (
              <div className="border-t border-gray-700 pt-3">
                <p className="text-gray-400 mb-1">Settlement</p>
                <div><span className="text-gray-500">Status:</span> <StatusBadge status={detail.settlementJob.status} /></div>
                <div><span className="text-gray-500">Amount:</span> <span className="text-white">${detail.settlementJob.amount?.toFixed(2)}</span></div>
                <div><span className="text-gray-500">Attempts:</span> <span className="text-white">{detail.settlementJob.attempts}</span></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
