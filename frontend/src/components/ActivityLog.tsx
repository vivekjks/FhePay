import { useState } from 'react';
import { useWatchContractEvent } from 'wagmi';
import { getFhePayAddress } from '../constants';
import { fhePayAbi } from '../abi/fhepay';

type EmployeeLog = { args?: { employee?: `0x${string}` } };
type AccountLog = { args?: { account?: `0x${string}` } };

/** Live tail of contract events (addresses only). Past history requires an indexer or explorer. */
export function ActivityLog() {
  const contract = getFhePayAddress();
  const [items, setItems] = useState<string[]>([]);

  useWatchContractEvent({
    address: contract,
    abi: fhePayAbi,
    eventName: 'SalarySet',
    enabled: !!contract,
    onLogs(logs: EmployeeLog[]) {
      for (const log of logs) {
        const employee = log.args?.employee;
        if (employee) setItems((prev) => [`SalarySet -> ${employee}`, ...prev].slice(0, 40));
      }
    },
  });

  useWatchContractEvent({
    address: contract,
    abi: fhePayAbi,
    eventName: 'SalaryPaid',
    enabled: !!contract,
    onLogs(logs: EmployeeLog[]) {
      for (const log of logs) {
        const employee = log.args?.employee;
        if (employee) setItems((prev) => [`SalaryPaid -> ${employee}`, ...prev].slice(0, 40));
      }
    },
  });

  useWatchContractEvent({
    address: contract,
    abi: fhePayAbi,
    eventName: 'Withdrawn',
    enabled: !!contract,
    onLogs(logs: AccountLog[]) {
      for (const log of logs) {
        const account = log.args?.account;
        if (account) setItems((prev) => [`Withdrawn -> ${account}`, ...prev].slice(0, 40));
      }
    },
  });

  if (!contract) return null;

  return (
    <section className="card" style={{ marginTop: '1rem' }}>
      <h2 style={{ marginTop: 0, fontFamily: 'Outfit, sans-serif' }}>Live activity</h2>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem' }}>
        Shows events while this page is open. Addresses only - never plaintext amounts.
      </p>
      {items.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Waiting for transactions...</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0 0', fontSize: '0.9rem' }}>
          {items.map((item, i) => (
            <li
              key={`${item}-${i}`}
              style={{
                padding: '0.45rem 0',
                borderBottom: '1px solid var(--border)',
                wordBreak: 'break-all',
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
