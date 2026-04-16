import { useEffect, useState } from 'react';
import { getAuditLogs } from '../api/admin.api';

export function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = () => {
    const params: Record<string, string> = { page: String(page), limit: '100' };
    if (entityFilter) params.entity = entityFilter;
    if (actorFilter) params.actor = actorFilter;
    getAuditLogs(params)
      .then((d: any) => { setLogs(d.data); setTotal(d.total); })
      .catch(console.error);
  };

  useEffect(() => { fetchLogs(); }, [page, entityFilter, actorFilter]);

  return (
    <div className="p-6">
      <h2 className="text-white font-semibold text-lg mb-4">Audit Log</h2>
      <div className="flex gap-3 mb-4">
        <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="bg-[#2a2a3e] border border-gray-700 rounded px-3 py-1.5 text-white text-sm">
          <option value="">All Entities</option>
          <option value="SportsbookEvent">SportsbookEvent</option>
          <option value="Market">Market</option>
          <option value="Ticket">Ticket</option>
          <option value="SettlementJob">SettlementJob</option>
        </select>
        <input placeholder="Actor..." value={actorFilter}
          onChange={(e) => { setActorFilter(e.target.value); setPage(1); }}
          className="bg-[#2a2a3e] border border-gray-700 rounded px-3 py-1.5 text-white text-sm w-40" />
      </div>
      <div className="bg-[#1a1a2e] border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left px-4 py-3">Timestamp</th>
              <th className="text-left px-4 py-3">Actor</th>
              <th className="text-left px-4 py-3">Entity</th>
              <th className="text-left px-4 py-3">Entity ID</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={5} className="text-gray-500 text-center py-8">No audit logs found</td></tr>
            )}
            {logs.map((l: any) => (
              <>
                <tr key={l.id} onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                  className="border-b border-gray-800/50 text-white cursor-pointer hover:bg-white/5">
                  <td className="px-4 py-3 text-gray-400">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{l.actor}</td>
                  <td className="px-4 py-3 text-gray-400">{l.entity}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{l.entityId?.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs">{l.action}</span>
                  </td>
                </tr>
                {expandedId === l.id && (
                  <tr key={`${l.id}-detail`} className="border-b border-gray-800/50">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Before</p>
                          <pre className="bg-[#2a2a3e] rounded p-3 text-xs text-gray-300 overflow-auto max-h-60">
                            {l.before ? JSON.stringify(l.before, null, 2) : 'N/A'}
                          </pre>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">After</p>
                          <pre className="bg-[#2a2a3e] rounded p-3 text-xs text-gray-300 overflow-auto max-h-60">
                            {l.after ? JSON.stringify(l.after, null, 2) : 'N/A'}
                          </pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
        <span>{total} entries total</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="px-3 py-1 bg-[#2a2a3e] rounded disabled:opacity-30">Prev</button>
          <span className="px-3 py-1">Page {page}</span>
          <button disabled={logs.length < 100} onClick={() => setPage(page + 1)}
            className="px-3 py-1 bg-[#2a2a3e] rounded disabled:opacity-30">Next</button>
        </div>
      </div>
    </div>
  );
}
