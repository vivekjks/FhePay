import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { motion } from 'framer-motion';
import { LogOut, Plug, ShieldCheck, Wifi } from 'lucide-react';
import { sepolia } from 'viem/chains';
import { shortAddress } from '../utils/format';

export function ConnectBar() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== sepolia.id;

  return (
    <motion.div className="connect-card" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
      <div className="connect-summary">
        <span className={`status-pill ${isConnected ? 'status-ok' : 'status-warn'}`}>
          <Wifi size={14} />
          {isConnected ? 'Wallet connected' : 'Wallet required'}
        </span>
        <span className={`status-pill ${!wrongNetwork ? 'status-ok' : 'status-danger'}`}>
          <ShieldCheck size={14} />
          {!wrongNetwork ? 'Sepolia' : `Chain ${chainId}`}
        </span>
        {isConnected && <code className="address-chip">{shortAddress(address)}</code>}
      </div>

      <div className="connect-actions">
        {!isConnected ? (
          connectors.map((connector) => (
            <button
              type="button"
              className="btn"
              key={connector.uid}
              disabled={isPending}
              onClick={() => connect({ connector })}
            >
              <Plug size={16} />
              {isPending ? 'Connecting...' : `Connect ${connector.name}`}
            </button>
          ))
        ) : (
          <>
            {wrongNetwork && (
              <button
                type="button"
                className="btn"
                disabled={switching}
                onClick={() => switchChain({ chainId: sepolia.id })}
              >
                <ShieldCheck size={16} />
                {switching ? 'Switching...' : 'Switch to Sepolia'}
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => disconnect()}>
              <LogOut size={16} />
              Disconnect
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
