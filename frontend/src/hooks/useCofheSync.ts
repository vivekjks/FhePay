import { useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { WagmiAdapter } from '@cofhe/sdk/adapters';
import { cofheClient } from '../cofhe';

/** Keeps @cofhe/sdk connected to the active wagmi wallet + Sepolia. */
export function useCofheSync() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!isConnected || !walletClient || !publicClient) {
      cofheClient.disconnect();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { publicClient: pc, walletClient: wc } = await WagmiAdapter(
          walletClient,
          publicClient,
        );
        if (!cancelled) {
          // viem minor API drift between wagmi and @cofhe/sdk peer deps
          await cofheClient.connect(pc as never, wc as never);
        }
      } catch (e) {
        console.error('CoFHE connect failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, isConnected, walletClient, publicClient]);
}
