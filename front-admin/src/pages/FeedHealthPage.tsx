import { useEffect, useState } from 'react';
import { getFeedHealth } from '../api/admin.api';
import { StatusBadge } from '../components/StatusBadge';

export function FeedHealthPage() {
  const [feeds, setFeeds] = useState<any[]>([]);

  useEffect(() => {
    const fetch = () =>
      getFeedHealth()
        .then((d: any) => setFeeds(d.feeds || []))
        .catch(console.error);
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-white font-semibold text-lg mb-4">Feed Health</h2>
      <div className="bg-[#1a1a2e] border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left px-4 py-3">League</th>
              <th className="text-left px-4 py-3">Last Sync</th>
              <th className="text-left px-4 py-3">Age (s)</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Active</th>
              <th className="text-right px-4 py-3">Suspended</th>
            </tr>
          </thead>
          <tbody>
            {feeds.length === 0 && (
              <tr>
                <td colSpan={6} className="text-gray-500 text-center py-8">
                  No feeds found
                </td>
              </tr>
            )}
            {feeds.map((f: any) => (
              <tr key={f.league} className="border-b border-gray-800/50 text-white">
                <td className="px-4 py-3 font-medium">{f.league}</td>
                <td className="px-4 py-3 text-gray-400">
                  {f.lastSyncAt ? new Date(f.lastSyncAt).toLocaleTimeString() : 'N/A'}
                </td>
                <td className="px-4 py-3 text-gray-400">{f.ageSeconds}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={f.status} />
                </td>
                <td className="px-4 py-3 text-right text-green-400">{f.activeEventCount}</td>
                <td className="px-4 py-3 text-right text-orange-400">{f.suspendedEventCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
