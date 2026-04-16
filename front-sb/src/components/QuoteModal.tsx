import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useStore } from '../store/useStore';
import { useWallet } from '../hooks/useWallet';

const API_URL = 'http://127.0.0.1:3000';
const BET_API_URL = 'http://127.0.0.1:3002';

type Step = 'wallet' | 'quote' | 'signing' | 'awaiting' | 'done';

export default function QuoteModal() {
  const {
    isQuoteModalOpen,
    setQuoteModalOpen,
    activeQuote,
    setActiveQuote,
    walletAddress,
    setWalletAddress,
  } = useStore();

  const { connect, isConnecting, sendTransaction } = useWallet();

  const [step, setStep] = useState<Step>('wallet');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [oddsChanged, setOddsChanged] = useState<{
    newOdds: number;
  } | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync step with state when modal opens
  useEffect(() => {
    if (!isQuoteModalOpen) return;
    if (!walletAddress) {
      setStep('wallet');
    } else if (activeQuote) {
      setStep('quote');
    } else {
      setStep('wallet');
    }
    setError(null);
    setOddsChanged(null);
  }, [isQuoteModalOpen]);

  // Countdown timer
  useEffect(() => {
    if (step !== 'quote' || !activeQuote) return;
    const expiresAt = new Date(activeQuote.expiresAt).getTime();
    const update = () => {
      const remaining = Math.max(
        0,
        Math.floor((expiresAt - Date.now()) / 1000),
      );
      setTimeLeft(remaining);
    };
    update();
    timerRef.current = setInterval(update, 500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, activeQuote]);

  // Poll ticket status
  useEffect(() => {
    if (step !== 'awaiting' || !ticketId) return;
    const poll = async () => {
      try {
        const res = await axios.get(`${API_URL}/tickets/${ticketId}`);
        const status = res.data.status;
        setTicketStatus(status);
        if (status === 'CONFIRMED' || status === 'REJECTED') {
          setStep('done');
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch { /* silent */ }
    };
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, ticketId]);

  // WS TICKET_UPDATE via store ticketStatusMap
  const ticketStatusMap = useStore((s) => s.ticketStatusMap);
  useEffect(() => {
    if (!ticketId) return;
    const mapped = ticketStatusMap[ticketId];
    if (mapped && mapped !== ticketStatus) {
      setTicketStatus(mapped);
      if (mapped === 'CONFIRMED' || mapped === 'REJECTED') {
        setStep('done');
      }
    }
  }, [ticketId, ticketStatusMap]);

  const handleConnect = async () => {
    const addr = await connect();
    if (addr) {
      setWalletAddress(addr);
      if (activeQuote) setStep('quote');
    }
  };

  const handleSign = async () => {
    if (!activeQuote) return;
    setStep('signing');
    setError(null);
    try {
      const hash = await sendTransaction(activeQuote.txParams);
      setTxHash(hash);
      // Submit to bet-execution
      const res = await axios.post(`${BET_API_URL}/bets/confirm`, {
        quoteId: activeQuote.quoteId,
        txHash: hash,
        userId: walletAddress,
      });
      setTicketId(res.data.id);
      setStep('awaiting');
    } catch (e: any) {
      const userCancelled =
        e?.code === 4001 ||
        e?.message?.includes('user rejected') ||
        e?.message?.includes('User denied');
      if (userCancelled) {
        setStep('quote');
      } else {
        setError(e?.response?.data?.message || e.message || 'Transaction failed');
        setStep('quote');
      }
    }
  };

  const handleClose = useCallback(() => {
    setQuoteModalOpen(false);
    setActiveQuote(null);
    setStep('wallet');
    setTxHash(null);
    setTicketId(null);
    setTicketStatus(null);
    setError(null);
    setOddsChanged(null);
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [setQuoteModalOpen, setActiveQuote]);

  if (!isQuoteModalOpen) return null;

  const ttlPercent = activeQuote
    ? (timeLeft / activeQuote.ttlSeconds) * 100
    : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-sm mx-4 bg-surface-container-low border border-outline-variant/20 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/10">
          <h2 className="font-black italic text-lg uppercase tracking-tight text-on-surface">
            {step === 'wallet' && 'Connect Wallet'}
            {step === 'quote' && 'Confirm Bet'}
            {step === 'signing' && 'Sign Transaction'}
            {step === 'awaiting' && 'Confirming…'}
            {step === 'done' && (ticketStatus === 'CONFIRMED' ? 'Bet Placed!' : 'Bet Failed')}
          </h2>
          <button onClick={handleClose} className="p-2 bg-surface-container-highest rounded-full text-on-surface-variant hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Bet Summary (shown on all steps) */}
          {activeQuote && (
            <div className="bg-black/30 rounded-2xl p-4 border border-outline-variant/10 space-y-2">
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
                {activeQuote.match.homeTeam} vs {activeQuote.match.awayTeam}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-on-surface capitalize">
                  {activeQuote.selection.name} wins
                </span>
                <span className="font-black text-secondary text-lg">
                  {activeQuote.oddsAtQuote.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-on-surface-variant">Stake</span>
                <span className="font-black text-on-surface">${activeQuote.stake}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-outline-variant/10">
                <span className="text-on-surface-variant">Potential Payout</span>
                <span className="font-black text-tertiary">${activeQuote.expectedPayout.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Step: wallet */}
          {step === 'wallet' && (
            <div className="space-y-3">
              <p className="text-sm text-on-surface-variant text-center">
                Connect your MetaMask wallet to place bets.
              </p>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full py-3 bg-secondary text-on-secondary font-black rounded-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {isConnecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            </div>
          )}

          {/* Step: quote */}
          {step === 'quote' && activeQuote && (
            <div className="space-y-3">
              {/* TTL Countdown */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-black text-on-surface-variant">
                  <span>Quote expires in</span>
                  <span className={timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-secondary'}>
                    {timeLeft}s
                  </span>
                </div>
                <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full transition-all"
                    style={{ width: `${ttlPercent}%` }}
                  />
                </div>
              </div>

              {/* Wallet */}
              <p className="text-[10px] text-on-surface-variant text-center">
                Wallet: {walletAddress?.slice(0, 6)}…{walletAddress?.slice(-4)}
              </p>

              {/* Odds changed */}
              {oddsChanged && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-xs text-yellow-400">
                  Odds changed to {oddsChanged.newOdds.toFixed(2)}. Click to accept.
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400">
                  {error}
                </div>
              )}

              {timeLeft === 0 ? (
                <div className="space-y-2">
                  <p className="text-center text-sm text-red-400 font-black">Quote expired</p>
                  <button
                    onClick={handleClose}
                    className="w-full py-3 bg-surface-container-high text-on-surface font-black rounded-xl"
                  >
                    Request New Quote
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSign}
                  className="w-full py-3 bg-secondary text-on-secondary font-black rounded-xl shadow-[0_4px_15px_rgba(254,148,0,0.3)] hover:shadow-[0_6px_25px_rgba(254,148,0,0.4)] transition-all active:scale-95"
                >
                  Confirm & Sign
                </button>
              )}
            </div>
          )}

          {/* Step: signing */}
          {step === 'signing' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-10 h-10 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-on-surface-variant">Waiting for wallet signature…</p>
            </div>
          )}

          {/* Step: awaiting */}
          {step === 'awaiting' && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="w-10 h-10 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-on-surface-variant">Confirming on-chain…</p>
              {txHash && (
                <p className="text-[10px] text-on-surface-variant break-all text-center">
                  {txHash.slice(0, 20)}…{txHash.slice(-10)}
                </p>
              )}
            </div>
          )}

          {/* Step: done */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-3 py-2">
              {ticketStatus === 'CONFIRMED' ? (
                <>
                  <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-400 !text-3xl">check_circle</span>
                  </div>
                  <p className="font-black text-green-400 text-lg">Bet Confirmed!</p>
                  {ticketId && (
                    <p className="text-[10px] text-on-surface-variant">
                      Ticket: {ticketId.slice(0, 8)}…
                    </p>
                  )}
                  <button
                    onClick={handleClose}
                    className="w-full py-3 bg-secondary text-on-secondary font-black rounded-xl"
                  >
                    View My Bets
                  </button>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-red-400 !text-3xl">cancel</span>
                  </div>
                  <p className="font-black text-red-400 text-lg">Bet Rejected</p>
                  <button
                    onClick={handleClose}
                    className="w-full py-3 bg-surface-container-high text-on-surface font-black rounded-xl"
                  >
                    Try Again
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
