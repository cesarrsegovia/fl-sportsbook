import { useState, useCallback } from 'react';
import { BrowserProvider } from 'ethers';

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask not installed');
      return null;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      setAddress(accounts[0]);
      return accounts[0] as string;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const sendTransaction = useCallback(
    async (txParams: { to: string; value: string; data: string }) => {
      if (!window.ethereum) throw new Error('No wallet');
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: txParams.to,
        value: BigInt(txParams.value),
        data: txParams.data,
      });
      return tx.hash;
    },
    [],
  );

  const disconnect = useCallback(() => setAddress(null), []);

  return { address, isConnecting, error, connect, disconnect, sendTransaction };
}
