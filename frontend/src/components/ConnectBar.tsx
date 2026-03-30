import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { motion } from 'framer-motion';

export function ConnectBar() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== sepolia.id;

  return (
    <motion.div
      className="card"
      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {!isConnected ? (
        <button
          type="button"
          className="btn"
          disabled={isPending}
          onClick={() => connect({ connector: connectors[0] })}
        >
          {isPending ? 'Connecting…' : 'Connect wallet'}
        </button>
      ) : (
        <>
          <span style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </span>
          {wrongNetwork && (
            <button
              type="button"
              className="btn"
              disabled={switching}
              onClick={() => switchChain({ chainId: sepolia.id })}
            >
              {switching ? 'Switching…' : 'Switch to Sepolia'}
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => disconnect()}>
            Disconnect
          </button>
        </>
      )}
    </motion.div>
  );
}
