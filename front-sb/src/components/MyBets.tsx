import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { useTickets } from '../hooks/useTickets';
import CashoutModal from './CashoutModal';

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  CONFIRMED: { label: 'Confirmed', classes: 'bg-green-500/20 text-green-400' },
  CASHED_OUT: { label: 'Cashed Out', classes: 'bg-gray-500/20 text-gray-300' },
  SUBMITTED: { label: 'Submitted', classes: 'bg-yellow-500/20 text-yellow-400 animate-pulse' },
  CONFIRMING: { label: 'Confirming', classes: 'bg-yellow-500/20 text-yellow-400 animate-pulse' },
  WON: { label: 'Won', classes: 'bg-emerald-400/20 text-emerald-300' },
  LOST: { label: 'Lost', classes: 'bg-red-500/20 text-red-400' },
  VOID: { label: 'Void', classes: 'bg-gray-500/20 text-gray-400' },
  REFUNDED: { label: 'Refunded', classes: 'bg-blue-500/20 text-blue-400' },
  SETTLING: { label: 'Paying out...', classes: 'bg-orange-500/20 text-orange-400 animate-pulse' },
  SETTLED: { label: 'Settled', classes: 'bg-emerald-500/20 text-emerald-300' },
  SETTLEMENT_FAILED: { label: 'Payment issue', classes: 'bg-orange-500/20 text-orange-400' },
  MANUAL_REVIEW: { label: 'Under review', classes: 'bg-orange-500/20 text-orange-400' },
  REJECTED: { label: 'Rejected', classes: 'bg-red-900/20 text-red-600' },
  EXPIRED: { label: 'Expired', classes: 'bg-red-900/20 text-red-600' },
};

const TRANSIENT_STATUSES = new Set([
  'SUBMITTED', 'CONFIRMING', 'SETTLING',
]);

export default function MyBets() {
  const { walletAddress, setSelectedSection } = useStore();
  const { tickets, loading, fetchTickets } = useTickets(walletAddress);
  const [cashoutCtx, setCashoutCtx] = useState<{
    ticketId: string;
    stake: number;
    potentialPayout: number;
  } | null>(null);

  useEffect(() => {
    if (walletAddress) fetchTickets();
  }, [walletAddress, fetchTickets]);

  if (!walletAddress) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center opacity-50 p-8">
        <span className="material-symbols-outlined text-5xl! mb-4">account_balance_wallet</span>
        <p className="font-bold text-sm">Connect your wallet to see your bets</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="font-black italic text-xl uppercase tracking-tight text-on-surface">My Bets</h2>
        <button
          onClick={() => fetchTickets()}
          className="p-2 bg-surface-container-high rounded-full text-on-surface-variant hover:text-white"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
        </button>
      </div>

      {loading && tickets.length === 0 ? (
        <div className="flex items-center justify-center flex-1 opacity-50">
          <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 opacity-40 text-center px-8">
          <span className="material-symbols-outlined text-5xl! mb-3">receipt_long</span>
          <p className="font-bold text-sm">No bets yet</p>
          <button
            onClick={() => setSelectedSection('sportsbook')}
            className="mt-4 text-secondary text-xs font-black"
          >
            Browse events →
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-3">
          {tickets.map((ticket) => {
            const quote = ticket.quote;
            const selection = quote?.selection;
            const market = selection?.market;
            const event = market?.event;
            const match = event?.match;
            const settlementJob = (ticket as any).settlementJob;
            const cfg = STATUS_CONFIG[ticket.status] ?? {
              label: ticket.status,
              classes: 'bg-gray-500/20 text-gray-400',
            };

            const isSettled = ticket.status === 'SETTLED';
            const isWon = ticket.status === 'WON';
            const isSettling = ticket.status === 'SETTLING';
            const isSettlementFailed = ticket.status === 'SETTLEMENT_FAILED';
            const isConfirmed = ticket.status === 'CONFIRMED';
            const isCashedOut = ticket.status === 'CASHED_OUT';
            const isSingle = (ticket.type ?? 'SINGLE') === 'SINGLE';
            const startTime = match?.startTime ? new Date(match.startTime) : null;
            const eventStarted = startTime ? new Date() >= startTime : false;
            const cashoutEligible = isConfirmed && isSingle && !eventStarted;
            const payoutAmount = isSettled || isSettling || isWon
              ? (settlementJob?.amount ?? quote?.expectedPayout)
              : null;

            return (
              <div
                key={ticket.id}
                className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-4 shadow-md"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">
                      {match?.league ?? '—'}
                    </p>
                    <p className="font-bold text-sm text-on-surface">
                      {match?.homeTeam} vs {match?.awayTeam}
                    </p>
                    <p className="text-xs text-secondary font-black capitalize mt-0.5">
                      {selection?.name} wins
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider ${cfg.classes}`}
                    >
                      {isSettling && (
                        <span className="inline-block w-2 h-2 rounded-full bg-orange-400 animate-pulse mr-1" />
                      )}
                      {cfg.label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-outline-variant/5">
                  <div className="text-center">
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">Stake</p>
                    <p className="font-black text-on-surface text-sm">${quote?.stake?.toFixed(2) ?? '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">Odds</p>
                    <p className="font-black text-secondary text-sm">{quote?.oddsAtQuote?.toFixed(2) ?? '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">
                      {isSettled ? 'Received' : 'Payout'}
                    </p>
                    <p className={`font-black text-sm ${isSettled ? 'text-emerald-300' : 'text-tertiary'}`}>
                      ${(payoutAmount ?? quote?.expectedPayout)?.toFixed(2) ?? '—'}
                    </p>
                  </div>
                </div>

                {isSettled && settlementJob?.txHash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${settlementJob.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-2 text-[9px] text-emerald-400 truncate hover:underline"
                  >
                    ✓ Payout TX: {settlementJob.txHash.slice(0, 20)}…
                  </a>
                )}

                {isSettlementFailed && (
                  <p className="mt-2 text-[9px] text-orange-400">
                    Payment issue — contact support
                  </p>
                )}

                {ticket.txHash && !isSettled && (
                  <p className="text-[9px] text-on-surface-variant mt-2 truncate">
                    TX: {ticket.txHash.slice(0, 16)}…
                  </p>
                )}

                {isCashedOut && ticket.cashoutAmount != null && (
                  <p className="mt-2 text-[10px] text-emerald-400 font-black">
                    Cashed out for ${Number(ticket.cashoutAmount).toFixed(2)}
                  </p>
                )}

                {cashoutEligible && (
                  <button
                    onClick={() =>
                      setCashoutCtx({
                        ticketId: ticket.id,
                        stake: quote?.stake ?? 0,
                        potentialPayout: quote?.expectedPayout ?? 0,
                      })
                    }
                    className="mt-3 w-full py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black rounded-lg text-xs uppercase tracking-wider hover:bg-emerald-500/30 transition-colors"
                  >
                    Cash Out
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cashoutCtx && walletAddress && (
        <CashoutModal
          ticketId={cashoutCtx.ticketId}
          userId={walletAddress}
          stake={cashoutCtx.stake}
          potentialPayout={cashoutCtx.potentialPayout}
          onClose={() => setCashoutCtx(null)}
          onCashedOut={() => {
            setCashoutCtx(null);
            fetchTickets();
          }}
        />
      )}
    </div>
  );
}
