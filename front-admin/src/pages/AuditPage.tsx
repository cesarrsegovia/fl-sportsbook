import { useEffect, useState } from 'react';
import { getAuditLogs } from '../api/admin.api';
import { AuditRow } from '../components/AuditRow';

/**
 * @page AuditPage
 * @description Registro de auditoría de todas las acciones administrativas realizadas en la plataforma.
 */
export function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const ENTITIES = ['SportsbookEvent', 'Market', 'Ticket', 'SettlementJob'];
  const PAGE_LIMIT = 50;

  const fetchLogs = async () => {
    setIsLoading(true);
    const params: Record<string, string> = { 
      page: String(page), 
      limit: String(PAGE_LIMIT) 
    };
    if (entityFilter) params.entity = entityFilter;
    if (actorFilter) params.actor = actorFilter;

    try {
      const response = await getAuditLogs(params);
      setLogs(response.data);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, entityFilter, actorFilter]);

  const handleEntityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEntityFilter(e.target.value);
    setPage(1);
  };

  const handleActorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setActorFilter(e.target.value);
    setPage(1);
  };

  return (
    <div className="p-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-white font-bold text-2xl tracking-tight">Audit Log</h2>
          <p className="text-gray-400 text-sm">Review system activity and operator decisions</p>
        </div>
        
        <div className="flex gap-2">
          <select 
            value={entityFilter} 
            onChange={handleEntityChange}
            className="bg-[#2a2a3e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Entities</option>
            {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <input 
            placeholder="Search by Actor..." 
            value={actorFilter}
            onChange={handleActorChange}
            className="bg-[#2a2a3e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm w-48 focus:border-blue-500 focus:outline-none" 
          />
        </div>
      </header>

      <div className="bg-[#1a1a2e] border border-gray-800 rounded-xl overflow-hidden shadow-2xl shadow-black/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 uppercase text-[10px] font-bold tracking-widest bg-white/2">
                <th className="text-left px-4 py-4">Timestamp</th>
                <th className="text-left px-4 py-4">Actor</th>
                <th className="text-left px-4 py-4">Entity</th>
                <th className="text-left px-4 py-4">Entity ID</th>
                <th className="text-left px-4 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {logs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="text-gray-500 text-center py-12">
                    No matching audit logs found
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <AuditRow key={log.id} log={log} />
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <footer className="bg-white/2 border-t border-gray-800 px-4 py-3 flex justify-between items-center text-xs text-gray-400">
          <span>Displaying {logs.length} of {total} entries</span>
          <div className="flex items-center gap-4">
            <span className="text-gray-500">Page {page}</span>
            <div className="flex gap-1">
              <button 
                disabled={page <= 1} 
                onClick={() => setPage(page - 1)}
                className="px-4 py-1.5 bg-[#2a2a3e] hover:bg-[#3a3a5e] rounded-md disabled:opacity-20 transition-colors"
              >
                Previous
              </button>
              <button 
                disabled={logs.length < PAGE_LIMIT} 
                onClick={() => setPage(page + 1)}
                className="px-4 py-1.5 bg-[#2a2a3e] hover:bg-[#3a3a5e] rounded-md disabled:opacity-20 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

