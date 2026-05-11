import { useState } from 'react';
import { useWatchContractEvent } from 'wagmi';
import { Activity, CheckCircle2 } from 'lucide-react';
import { fhePayAbi } from '../abi/fhepay';
import { getFhePayAddress } from '../constants';
import { formatEtherAmount, shortAddress } from '../utils/format';

export function ActivityLog() {
  const contract = getFhePayAddress();
  const [items, setItems] = useState<string[]>([]);

  function push(line: string) {
    setItems((prev) => [`${new Date().toLocaleTimeString()} - ${line}`, ...prev].slice(0, 40));
  }

  useWatchContractEvent({
    address: contract,
    abi: fhePayAbi,
    eventName: 'EmployeeRegistered',
    enabled: !!contract,
    onLogs(logs: unknown[]) {
      logs.forEach((log) => {
        const args = (log as { args?: { employee?: `0x${string}` } }).args;
        if (args?.employee) push(`Registered ${shortAddress(args.employee)}`);
      });
    },
  });

  useWatchContractEvent({
    address: contract,
    abi: fhePayAbi,
    eventName: 'EmployeeStatusUpdated',
    enabled: !!contract,
    onLogs(logs: unknown[]) {
      logs.forEach((log) => {
        const args = (log as { args?: { employee?: `0x${string}`; active?: boolean } }).args;
        if (args?.employee) push(`${args.active ? 'Activated' : 'Paused'} ${shortAddress(args.employee)}`);
      });
    },
  });

  useWatchContractEvent({
    address: contract,
    abi: fhePayAbi,
    eventName: 'SalarySet',
    enabled: !!contract,
    onLogs(logs: unknown[]) {
      logs.forEach((log) => {
        const args = (log as { args?: { employee?: `0x${string}` } }).args;
        if (args?.employee) push(`Salary set for ${shortAddress(args.employee)}`);
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
        if (args?.employee) push(`Payroll sent to ${shortAddress(args.employee)}`);
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
        const amount = typeof args?.amount === 'bigint' ? ` with ${formatEtherAmount(args.amount)}` : '';
        push(`Treasury funded${amount} by ${shortAddress(args?.from)}`);
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
        const args = (log as { args?: { account?: `0x${string}` } }).args;
        if (args?.account) push(`Withdrawal requested by ${shortAddress(args.account)}`);
      });
    },
  });

  useWatchContractEvent({
    address: contract,
    abi: fhePayAbi,
    eventName: 'WithdrawalCanceled',
    enabled: !!contract,
    onLogs(logs: unknown[]) {
      logs.forEach((log) => {
        const args = (log as { args?: { account?: `0x${string}` } }).args;
        if (args?.account) push(`Withdrawal canceled by ${shortAddress(args.account)}`);
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
        const amount = typeof args?.amount === 'bigint' ? ` for ${formatEtherAmount(args.amount)}` : '';
        if (args?.account) push(`ETH claim settled${amount} by ${shortAddress(args.account)}`);
      });
    },
  });

  if (!contract) return null;

  return (
    <section className="card panel-card activity-card">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Live chain feed</p>
          <h2>Payroll activity</h2>
          <p className="prose-muted">Events expose operations and settlement, while encrypted payroll amounts stay private.</p>
        </div>
        <span className="status-pill status-ok">
          <Activity size={14} />
          Watching
        </span>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">
          <CheckCircle2 size={18} />
          Waiting for payroll events...
        </div>
      ) : (
        <ul className="activity-list">
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
