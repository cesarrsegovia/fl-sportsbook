import { useState } from 'react';
import axios from 'axios';
import { useStore } from '../store/useStore';

const API_URL = 'http://127.0.0.1:3000';

function tryParseJson(str: string | undefined): any {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

export default function BetSlip() {
  const {
    bets, removeBet, isBetSlipOpen, toggleBetSlip,
    walletAddress, betSlipMode, setBetSlipMode,
    setActiveQuote, setQuoteModalOpen,
  } = useStore();

  const [stakeAmount, setStakeAmount] = useState(20);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const isParlay = betSlipMode === 'parlay';
  const totalOdds = bets.reduce((acc, bet) => acc * bet.oddsValue, 1);
  const totalOddsStr = totalOdds.toFixed(2);

  const hasDuplicateMatch =
    isParlay && bets.length !== new Set(bets.map(b => b.matchId)).size;

  const maxStake = isParlay ? 200 : 1000;

  const handlePlaceBet = async () => {
    setQuoteError(null);

    if (!walletAddress) {
      setQuoteModalOpen(true);
      return;
    }

    if (bets.length === 0) return;

    if (isParlay) {
      if (bets.length < 2) {
        setQuoteError('Parlay requires at least 2 selections');
        return;
      }
      if (hasDuplicateMatch) {
        setQuoteError('Cannot combine two selections from the same match');
        return;
      }
    } else {
      const bet = bets[0];
      if (!bet.selectionId) {
        setQuoteError('Selection not available — click on odds from an event to add a valid bet');
        return;
      }
    }

    setIsLoadingQuote(true);
    try {
      const body = isParlay
        ? {
            selections: bets.map(b => ({ selectionId: b.selectionId })),
            stake: stakeAmount,
            userId: walletAddress,
          }
        : {
            selectionId: bets[0].selectionId,
            stake: stakeAmount,
            userId: walletAddress,
          };
      const response = await axios.post(`${API_URL}/quotes`, body);
      setActiveQuote(response.data);
      setQuoteModalOpen(true);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Failed to get quote';
      const errorData = tryParseJson(msg);
      if (errorData?.code === 'ODDS_CHANGED') {
        setActiveQuote(null);
        setQuoteError(`Odds changed to ${errorData.newOdds?.toFixed(2)}. Refresh and try again.`);
      } else {
        setQuoteError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    } finally {
      setIsLoadingQuote(false);
    }
  };

  return (
    <>
      {isBetSlipOpen && (
        <div
          onClick={() => toggleBetSlip(false)}
          className="xl:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] transition-opacity"
        />
      )}

      <aside className={`fixed right-0 top-0 h-screen w-80 bg-surface-container-low/95 backdrop-blur-2xl border-l border-outline-variant/10 shadow-[-20px_0_40px_rgba(0,0,0,0.4)] flex flex-col z-[60] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isBetSlipOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/10">
          <div className="flex items-center gap-3">
            <h2 className="font-black italic text-xl tracking-tighter uppercase text-on-surface">Bet Slip</h2>
            {bets.length > 0 && (
              <span className="w-5 h-5 bg-secondary text-on-secondary rounded-full flex items-center justify-center text-xs font-black shadow-[0_0_10px_#fe9400]">
                {bets.length}
              </span>
            )}
          </div>
          <button onClick={() => toggleBetSlip(false)} className="p-2 bg-surface-container-highest hover:bg-surface-bright rounded-full text-on-surface-variant hover:text-white transition-colors active:scale-95">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-4 pt-3 pb-2 flex gap-2">
          <button
            onClick={() => setBetSlipMode('single')}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${!isParlay ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high text-on-surface-variant'}`}
          >
            Single
          </button>
          <button
            onClick={() => setBetSlipMode('parlay')}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${isParlay ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high text-on-surface-variant'}`}
          >
            Parlay
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
          {bets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
              <span className="material-symbols-outlined !text-[48px] mb-4">receipt_long</span>
              <p className="font-bold text-sm tracking-tight">Your bet slip is empty</p>
              <p className="text-xs mt-1">Click on the odds to add selections.</p>
              {isParlay && (
                <p className="text-[10px] mt-2 text-on-surface-variant">Parlay: add 2–8 selections from different matches.</p>
              )}
            </div>
          ) : (
            bets.map(bet => {
              const duplicate = isParlay && bets.filter(b => b.matchId === bet.matchId).length > 1;
              return (
                <div
                  key={bet.id}
                  className={`relative group bg-surface-container-lowest border p-4 rounded-xl shadow-lg border-l-4 overflow-hidden ${duplicate ? 'border-red-500/60 border-l-red-500' : 'border-outline-variant/10 border-l-secondary'}`}
                >
                  <div className="absolute top-0 right-0 p-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => removeBet(bet.id)} className="text-on-surface-variant hover:text-error transition-colors p-1">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                  <div className="flex flex-col pr-4">
                    <span className="font-black text-secondary text-sm mb-0.5 max-w-[200px] truncate" title={bet.selectionText}>{bet.selectionText}</span>
                    <span className="text-[10px] font-bold text-on-surface-variant mb-3 uppercase tracking-wider">{bet.matchText}</span>
                    <div className="flex items-center justify-between mt-1 pt-3 border-t border-outline-variant/5">
                      <span className="text-xs font-bold text-on-surface">Match Winner</span>
                      <span className="font-black text-secondary text-lg">{bet.oddsValue.toFixed(2)}</span>
                    </div>
                    {duplicate && (
                      <p className="text-[10px] text-red-400 mt-2">Same match as another leg — remove one.</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {bets.length > 0 && (
          <div className="p-6 bg-surface-container-lowest border-t border-outline-variant/10 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] mt-auto">
            <div className="bg-black/40 rounded-xl p-4 border border-outline-variant/5 mb-4">
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">
                  {isParlay ? 'Combined Odds' : 'Total Odds'}
                </span>
                <span className="font-black text-secondary text-lg text-glow-secondary">{totalOddsStr}</span>
              </div>
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Stake</span>
                <div className="flex items-center bg-surface-container-high rounded-md overflow-hidden ring-1 ring-outline-variant/20 focus-within:ring-secondary/50 transition-all">
                  <span className="px-3 text-on-surface-variant font-bold">$</span>
                  <input
                    type="number"
                    value={stakeAmount}
                    min={1}
                    max={maxStake}
                    onChange={(e) => setStakeAmount(parseFloat(e.target.value) || 0)}
                    className="w-16 bg-transparent border-none outline-none py-1 text-on-surface font-black placeholder:text-on-surface/20"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                <span className="font-black text-tertiary uppercase tracking-widest text-[10px]">Potential Payout</span>
                <span className="font-black text-tertiary text-xl text-glow-tertiary">${(totalOdds * stakeAmount).toFixed(2)}</span>
              </div>
            </div>

            {quoteError && (
              <div className="mb-3 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-400">
                {quoteError}
              </div>
            )}

            {isParlay && hasDuplicateMatch && (
              <div className="mb-3 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-400">
                Cannot combine two selections from the same match.
              </div>
            )}

            <button
              onClick={handlePlaceBet}
              disabled={isLoadingQuote || (isParlay && (hasDuplicateMatch || bets.length < 2))}
              className="w-full py-4 bg-secondary text-on-secondary font-black rounded-xl shadow-[0_4px_15px_rgba(254,148,0,0.3)] hover:shadow-[0_6px_25px_rgba(254,148,0,0.4)] transition-all active:scale-95 uppercase tracking-tighter text-lg disabled:opacity-50"
            >
              {isLoadingQuote ? 'Getting Quote…' : walletAddress ? (isParlay ? 'Place Parlay' : 'Place Bet') : 'Connect & Bet'}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
