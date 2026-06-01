import { useReadContract } from 'wagmi';
import { AlertTriangle, Copy, ExternalLink, Server, Users, Wallet } from 'lucide-react';
import { sepolia } from 'viem/chains';
import { fhePayAbi } from '../abi/fhepay';
import { getFhePayAddress } from '../constants';
import { formatDuration, formatEtherAmount } from '../utils/format';

export function ContractStatus() {
  const contractAddress = getFhePayAddress();

  const { data: treasuryBalance } = useReadContract({
    address: contractAddress,
    abi: fhePayAbi,
    functionName: 'treasuryBalance',
    query: { enabled: !!contractAddress },
  });
  const { data: payInterval } = useReadContract({
    address: contractAddress,
    abi: fhePayAbi,
    functionName: 'payInterval',
    query: { enabled: !!contractAddress },
  });
  const { data: employeeCount } = useReadContract({
    address: contractAddress,
    abi: fhePayAbi,
    functionName: 'employeeCount',
    query: { enabled: !!contractAddress },
  });
  const { data: treasuryBelowAlert } = useReadContract({
    address: contractAddress,
    abi: fhePayAbi,
    functionName: 'treasuryBelowAlert',
    query: { enabled: !!contractAddress },
  });

  if (!contractAddress) return null;
  const safeAddress = contractAddress;
  const explorer = `https://sepolia.etherscan.io/address/${safeAddress}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(safeAddress);
    } catch {
      // Clipboard access can be blocked by browser settings.
    }
  }

  return (
    <section className="contract-status">
      <div className="status-tile">
        <Server size={18} />
        <div>
          <span className="label">Network</span>
          <strong>{sepolia.name}</strong>
          <small>Chain {sepolia.id}</small>
        </div>
      </div>
      <div className="status-tile">
        {treasuryBelowAlert ? <AlertTriangle size={18} /> : <Wallet size={18} />}
        <div>
          <span className="label">Treasury</span>
          <strong>{typeof treasuryBalance === 'bigint' ? formatEtherAmount(treasuryBalance) : 'Loading...'}</strong>
          <small>{treasuryBelowAlert ? 'Below alert threshold' : 'Claim liquidity'}</small>
        </div>
      </div>
      <div className="status-tile">
        <Users size={18} />
        <div>
          <span className="label">Roster</span>
          <strong>{typeof employeeCount === 'bigint' ? employeeCount.toString() : 'Loading...'}</strong>
          <small>{typeof payInterval === 'bigint' ? formatDuration(payInterval) : 'Pay interval'}</small>
        </div>
      </div>
      <div className="contract-address-tile">
        <span className="label">FhePay contract</span>
        <code>{safeAddress}</code>
        <div className="button-row">
          <button type="button" className="icon-btn" title="Copy contract address" onClick={() => void copy()}>
            <Copy size={18} />
          </button>
          <a href={explorer} target="_blank" rel="noreferrer" className="icon-btn" title="Open on Etherscan">
            <ExternalLink size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}
