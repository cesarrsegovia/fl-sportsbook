import { useState } from 'react';

interface AuditRowProps {
  log: any;
}

export function AuditRow({ log: l }: AuditRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr 
        onClick={() => setIsExpanded(!isExpanded)}
        className="border-b border-gray-800/50 text-white cursor-pointer hover:bg-white/5 transition-colors"
      >
        <td className="px-4 py-3 text-gray-400">
          {new Date(l.createdAt).toLocaleString()}
        </td>
        <td className="px-4 py-3 font-medium">
          {l.actor}
        </td>
        <td className="px-4 py-3 text-gray-400 text-xs">
          {l.entity}
        </td>
        <td className="px-4 py-3 font-mono text-[10px] text-gray-500 uppercase">
          {l.entityId?.slice(0, 8)}...
        </td>
        <td className="px-4 py-3">
          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            {l.action}
          </span>
        </td>
      </tr>
      
      {isExpanded && (
        <tr className="border-b border-gray-800/50 bg-[#16162a]">
          <td colSpan={5} className="px-6 py-6 transition-all duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <JsonPanel title="Before" data={l.before} color="border-red-500/10" />
              <JsonPanel title="After" data={l.after} color="border-green-500/10" />
            </div>
            {l.reason && (
              <div className="mt-4 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded">
                <p className="text-yellow-500/60 text-[10px] uppercase font-bold mb-1">Reason for modification</p>
                <p className="text-gray-300 text-sm italic">"{l.reason}"</p>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function JsonPanel({ title, data, color }: { title: string, data: any, color: string }) {
  const content = data ? JSON.stringify(data, null, 2) : 'No data available';
  
  return (
    <div className={`border ${color} rounded-lg overflow-hidden`}>
      <header className="bg-white/5 px-3 py-1.5 border-b border-white/5 flex justify-between items-center text-[10px] uppercase font-bold text-gray-400">
        <span>{title}</span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(content);
          }}
          className="hover:text-white transition-colors"
        >
          Copy
        </button>
      </header>
      <pre className="bg-[#0f0f1a] p-4 text-[11px] text-gray-400 font-mono overflow-auto max-h-80 custom-scrollbar">
        {content}
      </pre>
    </div>
  );
}
