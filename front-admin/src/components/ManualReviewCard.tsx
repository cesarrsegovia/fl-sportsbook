import { useState } from 'react';
import { gradeTicket } from '../api/admin.api';
import { parseEspnResult } from '../api/espn.utils';

interface ManualReviewCardProps {
  ticket: any;
  onGraded: (ticketId: string) => void;
}

const OUTCOMES = ['WIN', 'LOSS', 'VOID', 'REFUND'] as const;

export function ManualReviewCard({ ticket: t, onGraded }: ManualReviewCardProps) {
  const [outcome, setOutcome] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const match = t.quote?.selection?.market?.event?.match;
  const result = parseEspnResult(t.gradingRecord?.resultRaw);

  const handleGrade = async () => {
    if (!outcome || !reason || reason.length < 10) return;
    setIsLoading(true);
    try {
      await gradeTicket(t.id, outcome, reason);
      onGraded(t.id);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to grade ticket');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = outcome && reason.length >= 10;

  return (
    <div className="bg-[#1a1a2e] border border-gray-800 rounded-lg p-5">
      {/* Ticket Details */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <DetailItem label="Ticket" value={`${t.id.slice(0, 8)}...${t.id.slice(-4)}`} mono />
        <DetailItem label="User" value={`${t.userId?.slice(0, 10)}...${t.userId?.slice(-4)}`} mono />
        <DetailItem label="Match" value={`${match?.homeTeam} vs ${match?.awayTeam}`} />
        <DetailItem label="Selection" value={`${t.quote?.selection?.name} @ ${t.quote?.oddsAtQuote?.toFixed(2)}`} />
        <DetailItem label="Stake" value={`$${t.quote?.stake?.toFixed(2)}`} />
        <DetailItem label="Expected Payout" value={`$${t.quote?.expectedPayout?.toFixed(2)}`} color="text-green-400" />
      </div>

      {/* Result Helper */}
      {result ? (
        <div className="bg-[#2a2a3e] rounded p-3 mb-4">
          <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider">ESPN Result Data</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
            <ResultField label="Home" value={result.homeScore} />
            <ResultField label="Away" value={result.awayScore} />
            <ResultField label="Status" value={result.completed ? 'Completed' : 'Live'} />
            <ResultField label="H. Winner" value={String(result.homeWinner)} />
            <ResultField label="A. Winner" value={String(result.awayWinner)} />
          </div>
        </div>
      ) : (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mb-4 text-orange-400 text-sm">
          Result could not be determined automatically
        </div>
      )}

      {/* Outcome Selector */}
      <div className="flex flex-wrap gap-2 mb-3">
        {OUTCOMES.map((o) => (
          <button 
            key={o}
            onClick={() => { setOutcome(o); setIsConfirming(false); }}
            className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${
              outcome === o
                ? getOutcomeColorClass(o)
                : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            {o}
          </button>
        ))}
      </div>

      {/* Reason Input */}
      <textarea
        placeholder="Reason for manual grade (min 10 characters)..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full bg-[#2a2a3e] border border-gray-600 rounded p-2 text-white text-sm mb-3 focus:outline-none focus:border-blue-500"
        rows={2}
      />

      {/* Actions */}
      {isConfirming ? (
        <div className="bg-blue-600/10 border border-blue-500/30 rounded p-3">
          <p className="text-white text-sm mb-3">
            Confirm: Grade as <strong>{outcome}</strong>
            {outcome === 'WIN' && ` — will pay $${t.quote?.expectedPayout?.toFixed(2)}`}
            {outcome === 'REFUND' && ` — will refund $${t.quote?.stake?.toFixed(2)}`}
          </p>
          <div className="flex gap-2">
            <button 
              onClick={handleGrade} 
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Confirm Decision'}
            </button>
            <button 
              onClick={() => setIsConfirming(false)}
              className="px-4 py-2 text-gray-400 text-sm hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsConfirming(true)}
          disabled={!isFormValid}
          className="px-6 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
        >
          Proceed to Grade
        </button>
      )}
    </div>
  );
}

// Sub-components for cleaner JSX
function DetailItem({ label, value, mono, color }: { label: string, value: any, mono?: boolean, color?: string }) {
  return (
    <div>
      <p className="text-gray-400 text-[10px] uppercase font-bold">{label}</p>
      <p className={`${color || 'text-white'} ${mono ? 'font-mono' : ''} text-sm truncate`}>{value}</p>
    </div>
  );
}

function ResultField({ label, value }: { label: string, value: any }) {
  return (
    <div>
      <span className="text-gray-500">{label}:</span> <span className="text-white">{value}</span>
    </div>
  );
}

function getOutcomeColorClass(outcome: string) {
  switch (outcome) {
    case 'WIN': return 'bg-green-600 border-green-500 text-white';
    case 'LOSS': return 'bg-red-600 border-red-500 text-white';
    case 'VOID': return 'bg-gray-600 border-gray-500 text-white';
    case 'REFUND': return 'bg-cyan-600 border-cyan-500 text-white';
    default: return 'border-gray-700 text-gray-400';
  }
}
