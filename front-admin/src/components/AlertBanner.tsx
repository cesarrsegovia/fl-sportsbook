import { useAdminStore } from '../store/useAdminStore';

export function AlertBanner() {
  const stats = useAdminStore((s) => s.stats);
  if (!stats) return null;

  const alerts: { text: string; type: 'red' | 'orange' }[] = [];

  if (stats.feed?.deadLeagues?.length > 0) {
    alerts.push({
      text: `Feed DEAD: ${stats.feed.deadLeagues.join(', ')}`,
      type: 'red',
    });
  }
  if (stats.feed?.staleLeagues?.length > 0) {
    alerts.push({
      text: `Feed stale: ${stats.feed.staleLeagues.join(', ')}`,
      type: 'orange',
    });
  }
  if (stats.tickets?.manualReviewPending > 0) {
    alerts.push({
      text: `${stats.tickets.manualReviewPending} tickets require manual review`,
      type: 'red',
    });
  }
  if (stats.settlements?.manualInterventionCount > 0) {
    alerts.push({
      text: `${stats.settlements.manualInterventionCount} payments require intervention`,
      type: 'red',
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`px-4 py-2 rounded text-sm font-medium ${
            a.type === 'red'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
          }`}
        >
          {a.type === 'red' ? '!!' : '!'} {a.text}
        </div>
      ))}
    </div>
  );
}
