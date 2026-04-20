import { useReadContract } from 'wagmi';
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

  if (!contractAddress) return null;
  const safeAddress = contractAddress;

  const explorer = `https://sepolia.etherscan.io/address/${safeAddress}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(safeAddress);
    } catch {
      // ignored
    }
  }

  return (
    <div className="card contract-status">
      <div>
        <p className="label" style={{ marginBottom: '0.25rem' }}>
          Network
        </p>
        <span className="badge">{sepolia.name}</span>
        <span style={{ marginLeft: '0.5rem', color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem' }}>
          Chain {sepolia.id}
        </span>
      </div>

      <div>
        <p className="label" style={{ marginBottom: '0.25rem' }}>
          Treasury
        </p>
        <strong style={{ fontSize: '1rem' }}>
          {typeof treasuryBalance === 'bigint' ? formatEtherAmount(treasuryBalance) : 'Loading...'}
        </strong>
      </div>

      <div>
        <p className="label" style={{ marginBottom: '0.25rem' }}>
          Pay interval
        </p>
        <strong style={{ fontSize: '1rem' }}>
          {typeof payInterval === 'bigint' ? formatDuration(payInterval) : 'Loading...'}
        </strong>
      </div>

      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <p className="label" style={{ marginBottom: '0.25rem' }}>
          FhePay contract
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <code
            style={{
              fontSize: '0.8rem',
              wordBreak: 'break-all',
              color: 'rgba(255,255,255,0.92)',
              background: 'rgba(255,255,255,0.06)',
              padding: '0.35rem 0.5rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            {safeAddress}
          </code>
          <button type="button" className="btn btn-ghost" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => void copy()}>
            Copy
          </button>
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
          >
            Etherscan
          </a>
        </div>
      </div>
    </div>
  );
}
