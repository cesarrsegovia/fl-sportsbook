import { useEffect } from 'react';
import { getStats } from '../api/admin.api';
import { useAdminStore } from '../store/useAdminStore';
import { AlertBanner } from '../components/AlertBanner';

export function DashboardPage() {
  const stats = useAdminStore((s) => s.stats);
  const setStats = useAdminStore((s) => s.setStats);

  useEffect(() => {
    const fetch = () => getStats().then(setStats).catch(console.error);
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, [setStats]);

  if (!stats) {
    return <div className="text-gray-400 p-6">Loading stats...</div>;
  }

  const cards = [
    {
      label: 'Tickets (24h)',
      value: stats.tickets.confirmedLast24h,
      color: 'text-blue-400',
    },
    {
      label: 'Manual Review',
      value: stats.tickets.manualReviewPending,
      color: stats.tickets.manualReviewPending > 0 ? 'text-red-400' : 'text-green-400',
    },
    {
      label: 'Payment Issues',
      value: stats.settlements.manualInterventionCount,
      color: stats.settlements.manualInterventionCount > 0 ? 'text-red-400' : 'text-green-400',
    },
    {
      label: 'Paid Today (USD)',
      value: `$${(stats.settlements.totalPaidTodayUsd || 0).toFixed(2)}`,
      color: 'text-emerald-400',
    },
  ];

  return (
    <div className="p-6">
      <AlertBanner />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-[#1a1a2e] border border-gray-800 rounded-lg p-4"
          >
            <p className="text-gray-400 text-xs mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1a1a2e] border border-gray-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3">Events</h3>
          <div className="flex gap-6">
            <div>
              <p className="text-gray-400 text-xs">Active</p>
              <p className="text-green-400 text-xl font-bold">{stats.events.activeCount}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Suspended</p>
              <p className="text-orange-400 text-xl font-bold">{stats.events.suspendedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1a1a2e] border border-gray-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3">Settlements</h3>
          <div className="flex gap-6">
            <div>
              <p className="text-gray-400 text-xs">Pending</p>
              <p className="text-yellow-400 text-xl font-bold">{stats.settlements.pendingCount}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Confirmed Today</p>
              <p className="text-green-400 text-xl font-bold">{stats.settlements.confirmedTodayCount}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
