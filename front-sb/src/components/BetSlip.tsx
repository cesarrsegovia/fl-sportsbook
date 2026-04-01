import { useStore } from '../store/useStore';

export default function BetSlip() {
  const { bets, removeBet, isBetSlipOpen, toggleBetSlip } = useStore();

  const totalOdds = bets.reduce((acc, bet) => acc * bet.oddsValue, 1).toFixed(2);
  const fakeStake = 20;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isBetSlipOpen && (
        <div 
          onClick={() => toggleBetSlip(false)}
          className="xl:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] transition-opacity"
        />
      )}

      {/* Slide-in Panel */}
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

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
          {bets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
              <span className="material-symbols-outlined !text-[48px] mb-4">receipt_long</span>
              <p className="font-bold text-sm tracking-tight">Your bet slip is empty</p>
              <p className="text-xs mt-1">Click on the odds to add selections.</p>
            </div>
          ) : (
            bets.map(bet => (
              <div key={bet.id} className="relative group bg-surface-container-lowest border border-outline-variant/10 p-4 rounded-xl shadow-lg border-l-4 border-l-secondary overflow-hidden">
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
                </div>
              </div>
            ))
          )}
        </div>

        {bets.length > 0 && (
          <div className="p-6 bg-surface-container-lowest border-t border-outline-variant/10 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] mt-auto">
            <div className="bg-black/40 rounded-xl p-4 border border-outline-variant/5 mb-4">
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Total Odds</span>
                <span className="font-black text-secondary text-lg text-glow-secondary">{totalOdds}</span>
              </div>
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Stake</span>
                <div className="flex items-center bg-surface-container-high rounded-md overflow-hidden ring-1 ring-outline-variant/20 focus-within:ring-secondary/50 transition-all">
                  <span className="px-3 text-on-surface-variant font-bold">$</span>
                  <input type="number" defaultValue={fakeStake} className="w-16 bg-transparent border-none outline-none py-1 text-on-surface font-black placeholder:text-on-surface/20" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                <span className="font-black text-tertiary uppercase tracking-widest text-[10px]">Potential Payout</span>
                <span className="font-black text-tertiary text-xl text-glow-tertiary">${(parseFloat(totalOdds) * fakeStake).toFixed(2)}</span>
              </div>
            </div>
            
            <button className="w-full py-4 bg-secondary text-on-secondary font-black rounded-xl shadow-[0_4px_15px_rgba(254,148,0,0.3)] hover:shadow-[0_6px_25px_rgba(254,148,0,0.4)] transition-all active:scale-95 uppercase tracking-tighter text-lg">
              Place Bets
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
