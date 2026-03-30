import { sepolia } from 'wagmi/chains';
import { getFhePayAddress } from '../constants';

export function ContractStatus() {
  const addr = getFhePayAddress();
  if (!addr) return null;

  const contractAddress = addr;
  const explorer = `https://sepolia.etherscan.io/address/${contractAddress}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(contractAddress);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="card"
      style={{
        marginTop: '1rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.75rem 1.25rem',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <p className="label" style={{ marginBottom: '0.25rem' }}>
          Network
        </p>
        <span className="badge">{sepolia.name}</span>
        <span style={{ marginLeft: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
          Chain {sepolia.id}
        </span>
      </div>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <p className="label" style={{ marginBottom: '0.25rem' }}>
          FhePay contract
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <code
            style={{
              fontSize: '0.8rem',
              wordBreak: 'break-all',
              color: 'rgba(255,255,255,0.9)',
              background: 'rgba(255,255,255,0.06)',
              padding: '0.35rem 0.5rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            {contractAddress}
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
