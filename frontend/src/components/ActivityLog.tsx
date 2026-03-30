import { useState } from 'react';
import { useWatchContractEvent } from 'wagmi';
import { getFhePayAddress } from '../constants';
import { fhePayAbi } from '../abi/fhepay';

/** Live tail of contract events (addresses only). Past history requires an indexer or explorer. */
export function ActivityLog() {
  const contract = getFhePayAddress();
  const [items, setItems] = useState<string[]>([]);

  useWatchContractEvent({
    address: contract,
    abi: fhePayAbi,
    eventName: 'SalarySet',
    enabled: !!contract,
    onLogs(logs) {
      for (const log of logs) {
        const e = (log as { args?: { employee?: `0x${string}` } }).args?.employee;
        if (e) setItems((prev) => [`SalarySet → ${e}`, ...prev].slice(0, 40));
      }
    },
  });

  useWatchContractEvent({
    address: contract,
    abi: fhePayAbi,
    eventName: 'SalaryPaid',
    enabled: !!contract,
    onLogs(logs) {
      for (const log of logs) {
        const e = (log as { args?: { employee?: `0x${string}` } }).args?.employee;
        if (e) setItems((prev) => [`SalaryPaid → ${e}`, ...prev].slice(0, 40));
      }
    },
  });

  useWatchContractEvent({
    address: contract,
    abi: fhePayAbi,
    eventName: 'Withdrawn',
    enabled: !!contract,
    onLogs(logs) {
      for (const log of logs) {
        const e = (log as { args?: { account?: `0x${string}` } }).args?.account;
        if (e) setItems((prev) => [`Withdrawn → ${e}`, ...prev].slice(0, 40));
      }
    },
  });

  if (!contract) return null;

  return (
    <section className="card" style={{ marginTop: '1rem' }}>
      <h2 style={{ marginTop: 0, fontFamily: 'Outfit, sans-serif' }}>Live activity</h2>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem' }}>
        Shows events while this page is open. Addresses only — never plaintext amounts.
      </p>
      {items.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Waiting for transactions…</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0 0', fontSize: '0.9rem' }}>
          {items.map((l, i) => (
            <li
              key={`${l}-${i}`}
              style={{
                padding: '0.45rem 0',
                borderBottom: '1px solid var(--border)',
                wordBreak: 'break-all',
              }}
            >
              {l}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
