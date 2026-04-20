import { useState } from 'react';
import { useWatchContractEvent } from 'wagmi';
import { fhePayAbi } from '../abi/fhepay';
import { getFhePayAddress } from '../constants';

export function ActivityLog() {
  const contract = getFhePayAddress();
  const [items, setItems] = useState<string[]>([]);

  function push(line: string) {
    setItems((prev) => [line, ...prev].slice(0, 40));
  }

  useWatchContractEvent({
    address: contract,
    abi: fhePayAbi,
    eventName: 'SalarySet',
    enabled: !!contract,
    onLogs(logs: unknown[]) {
      logs.forEach((log) => {
        const args = (log as { args?: { employee?: `0x${string}` } }).args;
        const employee = args?.employee;
        if (employee) push(`Salary set for ${employee}`);
      });
    },
  });

  useWatchContractEvent({
    address: contract,
    abi: fhePayAbi,
    eventName: 'SalaryPaid',
    enabled: !!contract,
    onLogs(logs: unknown[]) {
      logs.forEach((log) => {
        const args = (log as { args?: { employee?: `0x${string}` } }).args;
        const employee = args?.employee;
        if (employee) push(`Payroll sent to ${employee}`);
      });
    },
  });

  useWatchContractEvent({
    address: contract,
    abi: fhePayAbi,
    eventName: 'BatchSalaryPaid',
    enabled: !!contract,
    onLogs(logs: unknown[]) {
      logs.forEach((log) => {
        const args = (log as { args?: { count?: bigint } }).args;
        push(`Batch payroll confirmed for ${(args?.count ?? 0n).toString()} employees`);
      });
    },
  });

  useWatchContractEvent({
    address: contract,
    abi: fhePayAbi,
    eventName: 'TreasuryFunded',
    enabled: !!contract,
    onLogs(logs: unknown[]) {
      logs.forEach((log) => {
        const args = (log as { args?: { from?: `0x${string}`; amount?: bigint } }).args;
        push(`Treasury funded by ${args?.from ?? 'unknown wallet'}`);
      });
    },
  });

  useWatchContractEvent({
    address: contract,
    abi: fhePayAbi,
    eventName: 'WithdrawalRequested',
    enabled: !!contract,
    onLogs(logs: unknown[]) {
      logs.forEach((log) => {
        const args = (log as { args?: { account?: `0x${string}`; amount?: bigint } }).args;
        const account = args?.account;
        if (account) push(`Withdrawal requested by ${account}`);
      });
    },
  });

  useWatchContractEvent({
    address: contract,
    abi: fhePayAbi,
    eventName: 'WithdrawalClaimed',
    enabled: !!contract,
    onLogs(logs: unknown[]) {
      logs.forEach((log) => {
        const args = (log as { args?: { account?: `0x${string}`; amount?: bigint } }).args;
        const account = args?.account;
        if (account) {
          push(`ETH claim settled for ${account}`);
        }
      });
    },
  });

  if (!contract) return null;

  return (
    <section className="card" style={{ marginTop: '1rem' }}>
      <h2 style={{ marginTop: 0, fontFamily: 'Outfit, sans-serif' }}>Live activity</h2>
      <p className="prose-muted" style={{ marginTop: '0.35rem' }}>
        Watch payroll operations in real time while this page is open. Public events show addresses and settlement
        actions, while salary amounts remain confidential until a user explicitly claims funds.
      </p>
      {items.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Waiting for payroll activity...</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0 0', fontSize: '0.92rem' }}>
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              style={{
                padding: '0.55rem 0',
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
