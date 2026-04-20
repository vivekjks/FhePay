import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { sepolia } from 'viem/chains';

const rpc = import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(rpc),
  },
});
