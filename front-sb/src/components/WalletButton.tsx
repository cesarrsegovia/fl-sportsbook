import { useStore } from '../store/useStore';
import { useWallet } from '../hooks/useWallet';

export default function WalletButton() {
  const { walletAddress, setWalletAddress } = useStore();
  const { connect, isConnecting, error } = useWallet();

  const handleConnect = async () => {
    const addr = await connect();
    if (addr) setWalletAddress(addr);
  };

  if (walletAddress) {
    return (
      <button
        className="flex items-center gap-2 px-3 py-1.5 bg-secondary/10 border border-secondary/30 rounded-xl text-secondary text-xs font-black transition-all hover:bg-secondary/20"
        title={walletAddress}
      >
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
        {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-on-secondary rounded-xl text-xs font-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
      >
        <span className="material-symbols-outlined !text-[14px]">account_balance_wallet</span>
        {isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
      {error && <p className="text-red-400 text-[10px] mt-1">{error}</p>}
    </div>
  );
}
