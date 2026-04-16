import { useEffect, useState } from 'react';
import { getEvents, suspendEvent, reactivateEvent } from '../api/admin.api';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmModal } from '../components/ConfirmModal';

export function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [leagueFilter, setLeagueFilter] = useState('');
  const [modal, setModal] = useState<{ type: 'suspend' | 'reactivate'; eventId: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEvents = () => {
    const params: Record<string, string> = { page: String(page), limit: '20' };
    if (statusFilter) params.status = statusFilter;
    if (leagueFilter) params.league = leagueFilter;
    getEvents(params)
      .then((d: any) => { setEvents(d.data); setTotal(d.total); })
      .catch(console.error);
  };

  useEffect(() => { fetchEvents(); }, [page, statusFilter, leagueFilter]);

  const handleAction = async (reason: string) => {
    if (!modal) return;
    setLoading(true);
    try {
      if (modal.type === 'suspend') await suspendEvent(modal.eventId, reason);
      else await reactivateEvent(modal.eventId, reason);
      setModal(null);
      fetchEvents();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-white font-semibold text-lg mb-4">Events</h2>
      <div className="flex gap-3 mb-4">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-[#2a2a3e] border border-gray-700 rounded px-3 py-1.5 text-white text-sm">
          <option value="">All Status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="CLOSED">CLOSED</option>
          <option value="FINISHED">FINISHED</option>
        </select>
        <select value={leagueFilter} onChange={(e) => { setLeagueFilter(e.target.value); setPage(1); }}
          className="bg-[#2a2a3e] border border-gray-700 rounded px-3 py-1.5 text-white text-sm">
          <option value="">All Leagues</option>
          <option value="NBA">NBA</option>
          <option value="NHL">NHL</option>
          <option value="Libertadores">Libertadores</option>
          <option value="Soccer">Soccer</option>
        </select>
      </div>
      <div className="bg-[#1a1a2e] border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left px-4 py-3">Match</th>
              <th className="text-left px-4 py-3">League</th>
              <th className="text-left px-4 py-3">Start</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Markets</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr><td colSpan={6} className="text-gray-500 text-center py-8">No events found</td></tr>
            )}
            {events.map((ev: any) => (
              <tr key={ev.id} className="border-b border-gray-800/50 text-white">
                <td className="px-4 py-3">
                  {ev.match?.homeTeam} vs {ev.match?.awayTeam}
                </td>
                <td className="px-4 py-3 text-gray-400">{ev.match?.league}</td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(ev.match?.startTime).toLocaleString()}
                </td>
                <td className="px-4 py-3"><StatusBadge status={ev.status} /></td>
                <td className="px-4 py-3 text-gray-400">
                  {ev.markets?.map((m: any) => m.status).join(', ')}
                </td>
                <td className="px-4 py-3 text-right">
                  {ev.status === 'ACTIVE' && (
                    <button onClick={() => setModal({ type: 'suspend', eventId: ev.id, name: `${ev.match?.homeTeam} vs ${ev.match?.awayTeam}` })}
                      className="text-orange-400 hover:text-orange-300 text-xs font-medium">
                      Suspend
                    </button>
                  )}
                  {ev.status === 'SUSPENDED' && (
                    <button onClick={() => setModal({ type: 'reactivate', eventId: ev.id, name: `${ev.match?.homeTeam} vs ${ev.match?.awayTeam}` })}
                      className="text-green-400 hover:text-green-300 text-xs font-medium">
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
        <span>{total} events total</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="px-3 py-1 bg-[#2a2a3e] rounded disabled:opacity-30">Prev</button>
          <span className="px-3 py-1">Page {page}</span>
          <button disabled={events.length < 20} onClick={() => setPage(page + 1)}
            className="px-3 py-1 bg-[#2a2a3e] rounded disabled:opacity-30">Next</button>
        </div>
      </div>
      {modal && (
        <ConfirmModal
          title={`${modal.type === 'suspend' ? 'Suspend' : 'Reactivate'} Event`}
          description={`${modal.type === 'suspend' ? 'Suspend' : 'Reactivate'}: ${modal.name}`}
          confirmLabel={modal.type === 'suspend' ? 'Suspend' : 'Reactivate'}
          loading={loading}
          onConfirm={handleAction}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
