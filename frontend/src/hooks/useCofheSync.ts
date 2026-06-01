import { useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { disconnectLoadedCofheClient, getCofheClient } from '../cofhe';

/** Keeps @cofhe/sdk connected to the active wagmi wallet + Sepolia. */
export function useCofheSync() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!isConnected || !walletClient || !publicClient) {
      disconnectLoadedCofheClient();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [{ WagmiAdapter }, cofheClient] = await Promise.all([
          import('@cofhe/sdk/adapters'),
          getCofheClient(),
        ]);
        // Keep the adapter boundary tolerant of viem peer-version drift between wagmi and @cofhe/sdk.
        const { publicClient: pc, walletClient: wc } = await WagmiAdapter(
          walletClient as never,
          publicClient as never,
        );
        if (!cancelled) {
          // viem minor API drift between wagmi and @cofhe/sdk peer deps
          await cofheClient.connect(pc, wc);
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
