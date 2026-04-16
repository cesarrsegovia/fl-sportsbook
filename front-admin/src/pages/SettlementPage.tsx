import { useEffect, useState } from 'react';
import { getSettlements, retrySettlement } from '../api/admin.api';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmModal } from '../components/ConfirmModal';

export function SettlementPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [retryModal, setRetryModal] = useState<{ id: string; ticketId: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchJobs = () => {
    const params: Record<string, string> = { page: String(page), limit: '50' };
    if (statusFilter) params.status = statusFilter;
    getSettlements(params)
      .then((d: any) => { setJobs(d.data); setTotal(d.total); })
      .catch(console.error);
  };

  useEffect(() => { fetchJobs(); }, [page, statusFilter]);

  const handleRetry = async (reason: string) => {
    if (!retryModal) return;
    setLoading(true);
    try {
      await retrySettlement(retryModal.id, reason);
      setRetryModal(null);
      fetchJobs();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Retry failed');
    } finally {
      setLoading(false);
    }
  };

  const truncate = (s: string) => s ? `${s.slice(0, 8)}...${s.slice(-4)}` : '';

  return (
    <div className="p-6">
      <h2 className="text-white font-semibold text-lg mb-4">Settlements</h2>
      <div className="flex gap-3 mb-4">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-[#2a2a3e] border border-gray-700 rounded px-3 py-1.5 text-white text-sm">
          <option value="">All Status</option>
          <option value="PENDING">PENDING</option>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="FAILED">FAILED</option>
          <option value="MANUAL_INTERVENTION">MANUAL_INTERVENTION</option>
        </select>
      </div>
      <div className="bg-[#1a1a2e] border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left px-4 py-3">Job</th>
              <th className="text-left px-4 py-3">Ticket</th>
              <th className="text-left px-4 py-3">Wallet</th>
              <th className="text-right px-4 py-3">Amount</th>
              <th className="text-center px-4 py-3">Attempts</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">TxHash</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr><td colSpan={8} className="text-gray-500 text-center py-8">No settlement jobs found</td></tr>
            )}
            {jobs.map((j: any) => (
              <tr key={j.id} className="border-b border-gray-800/50 text-white">
                <td className="px-4 py-3 font-mono text-xs">{truncate(j.id)}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{truncate(j.ticketId)}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{truncate(j.toWallet)}</td>
                <td className="px-4 py-3 text-right text-green-400">${j.amount?.toFixed(2)}</td>
                <td className="px-4 py-3 text-center text-gray-400">{j.attempts}</td>
                <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{j.txHash ? truncate(j.txHash) : '-'}</td>
                <td className="px-4 py-3 text-right">
                  {['FAILED', 'MANUAL_INTERVENTION'].includes(j.status) && (
                    <button onClick={() => setRetryModal({ id: j.id, ticketId: j.ticketId })}
                      className="text-blue-400 hover:text-blue-300 text-xs font-medium">
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
        <span>{total} jobs total</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="px-3 py-1 bg-[#2a2a3e] rounded disabled:opacity-30">Prev</button>
          <span className="px-3 py-1">Page {page}</span>
          <button disabled={jobs.length < 50} onClick={() => setPage(page + 1)}
            className="px-3 py-1 bg-[#2a2a3e] rounded disabled:opacity-30">Next</button>
        </div>
      </div>
      {retryModal && (
        <ConfirmModal
          title="Retry Settlement"
          description={`Retry settlement for ticket ${retryModal.ticketId.slice(0, 8)}...`}
          confirmLabel="Retry Payment"
          loading={loading}
          onConfirm={handleRetry}
          onCancel={() => setRetryModal(null)}
        />
      )}
    </div>
  );
}
