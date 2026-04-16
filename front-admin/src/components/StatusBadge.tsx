const colorMap: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400',
  FRESH: 'bg-green-500/20 text-green-400',
  CONFIRMED: 'bg-blue-500/20 text-blue-400',
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  STALE: 'bg-orange-500/20 text-orange-400',
  SUSPENDED: 'bg-orange-500/20 text-orange-400',
  SETTLING: 'bg-yellow-500/20 text-yellow-400',
  MANUAL_REVIEW: 'bg-red-500/20 text-red-400',
  MANUAL_INTERVENTION: 'bg-red-500/20 text-red-400',
  SETTLEMENT_FAILED: 'bg-red-500/20 text-red-400',
  FAILED: 'bg-red-500/20 text-red-400',
  DEAD: 'bg-red-500/20 text-red-400',
  REJECTED: 'bg-red-500/20 text-red-400',
  WON: 'bg-emerald-500/20 text-emerald-400',
  LOST: 'bg-gray-500/20 text-gray-400',
  VOID: 'bg-gray-500/20 text-gray-400',
  REFUNDED: 'bg-cyan-500/20 text-cyan-400',
  SETTLED: 'bg-emerald-500/20 text-emerald-400',
  FINISHED: 'bg-gray-500/20 text-gray-400',
  CLOSED: 'bg-gray-500/20 text-gray-400',
  SUBMITTED: 'bg-blue-500/20 text-blue-400',
};

export function StatusBadge({ status }: { status: string }) {
  const color = colorMap[status] || 'bg-gray-500/20 text-gray-400';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
