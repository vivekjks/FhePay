import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Eye, LockKeyhole, RefreshCw, WalletCards } from 'lucide-react';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { isAddress } from 'viem/utils';
import { fhePayAbi } from '../abi/fhepay';
import { getCofheClient } from '../cofhe';
import { getFhePayAddress } from '../constants';
import { useCofheReady } from '../hooks/useCofheReady';
import { formatEtherAmount, shortAddress } from '../utils/format';

type Address = `0x${string}`;
type Hash = `0x${string}`;
type DecryptTarget = 'salary' | 'balance' | 'pending';

const targetConfig: Record<DecryptTarget, { label: string; functionName: 'salaryCiphertext' | 'balanceCiphertext' | 'pendingWithdrawalCiphertext' }> = {
  salary: { label: 'salary', functionName: 'salaryCiphertext' },
  balance: { label: 'balance', functionName: 'balanceCiphertext' },
  pending: { label: 'pending withdrawal', functionName: 'pendingWithdrawalCiphertext' },
};

export function AuditorPanel() {
  const contract = getFhePayAddress();
  const cofheReady = useCofheReady();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [employee, setEmployee] = useState('');
  const [salary, setSalary] = useState<bigint | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [pending, setPending] = useState<bigint | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<DecryptTarget | null>(null);

  const employeeAddress = useMemo(
    () => (isAddress(employee) ? (employee as Address) : undefined),
    [employee],
  );

  const { data: isAuditor } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'isAuditor',
    args: address ? [address] : undefined,
    query: { enabled: !!contract && !!address },
  });
  const { data: canAudit, refetch: refetchCanAudit } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'canAuditEmployee',
    args: address && employeeAddress ? [address, employeeAddress] : undefined,
    query: { enabled: !!contract && !!address && !!employeeAddress },
  });
  const { data: hasSalary } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'hasSalary',
    args: employeeAddress ? [employeeAddress] : undefined,
    query: { enabled: !!contract && !!employeeAddress },
  });
  const { data: hasPendingWithdrawal } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'hasPendingWithdrawal',
    args: employeeAddress ? [employeeAddress] : undefined,
    query: { enabled: !!contract && !!employeeAddress },
  });

  async function ensureSelfPermit() {
    const cofheClient = await getCofheClient();
    await cofheClient.permits.getOrCreateSelfPermit();
  }

  async function decrypt(target: DecryptTarget) {
    setMsg(null);
    if (!contract || !address || !employeeAddress || !publicClient || !cofheReady) {
      setMsg('Connect an auditor wallet, enter an employee address, and wait for CoFHE readiness.');
      return;
    }
    if (isAuditor !== true) {
      setMsg('This wallet is not enabled as an auditor on the contract.');
      return;
    }
    if (target === 'salary' && hasSalary === false) {
      setMsg('This employee does not have a salary handle yet.');
      return;
    }
    if (target === 'pending' && hasPendingWithdrawal === false) {
      setMsg('This employee has no pending withdrawal handle to review.');
      return;
    }

    setBusy(target);
    try {
      const latestAccess = await refetchCanAudit();
      if (latestAccess.data !== true) {
        setMsg('This auditor has not been granted disclosure access for that employee.');
        return;
      }

      const [{ FheTypes }, cofheClient] = await Promise.all([import('@cofhe/sdk'), getCofheClient()]);
      const config = targetConfig[target];
      const ct = (await publicClient.readContract({
        address: contract,
        abi: fhePayAbi,
        functionName: config.functionName,
        args: [employeeAddress],
      })) as Hash;

      await ensureSelfPermit();
      const value = await cofheClient.decryptForView(ct, FheTypes.Uint128).withPermit().execute();
      const nextValue = typeof value === 'bigint' ? value : BigInt(String(value));
      if (target === 'salary') setSalary(nextValue);
      if (target === 'balance') setBalance(nextValue);
      if (target === 'pending') setPending(nextValue);
      setMsg(`Decrypted ${config.label} for ${shortAddress(employeeAddress)}.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : `Could not decrypt ${targetConfig[target].label}.`);
    } finally {
      setBusy(null);
    }
  }

  if (!contract || !address || isAuditor !== true) return null;

  return (
    <motion.section className="card panel-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Auditor workspace</p>
          <h2>Selective disclosure review</h2>
          <p className="prose-muted">Decrypt only granted employee handles.</p>
        </div>
        <span className={`status-pill ${canAudit ? 'status-ok' : 'status-warn'}`}>
          {canAudit ? <BadgeCheck size={14} /> : <RefreshCw size={14} />}
          {canAudit ? 'Access granted' : 'Select employee'}
        </span>
      </div>

      <div className="surface-form">
        <div>
          <label className="label" htmlFor="audit-review-employee">
            Employee address
          </label>
          <input
            id="audit-review-employee"
            className="input"
            placeholder="0x..."
            value={employee}
            onChange={(e) => {
              setEmployee(e.target.value);
              setSalary(null);
              setBalance(null);
              setPending(null);
              setMsg(null);
            }}
            spellCheck={false}
          />
        </div>
        <div className="stats-grid compact-stats">
          <div className="stat-card">
            <span className="label">Salary</span>
            <strong>{salary === null ? 'Encrypted' : formatEtherAmount(salary)}</strong>
          </div>
          <div className="stat-card">
            <span className="label">Balance</span>
            <strong>{balance === null ? 'Encrypted' : formatEtherAmount(balance)}</strong>
          </div>
          <div className="stat-card">
            <span className="label">Pending withdrawal</span>
            <strong>
              {pending === null ? (hasPendingWithdrawal === false ? 'None' : 'Encrypted') : formatEtherAmount(pending)}
            </strong>
          </div>
        </div>
        <div className="button-row action-row">
          <button type="button" className="btn" disabled={busy !== null || !cofheReady} onClick={() => void decrypt('salary')}>
            <LockKeyhole size={16} />
            {busy === 'salary' ? 'Decrypting...' : 'Decrypt salary'}
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy !== null || !cofheReady} onClick={() => void decrypt('balance')}>
            <Eye size={16} />
            {busy === 'balance' ? 'Decrypting...' : 'Decrypt balance'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy !== null || !cofheReady || hasPendingWithdrawal === false}
            onClick={() => void decrypt('pending')}
          >
            <WalletCards size={16} />
            {busy === 'pending' ? 'Decrypting...' : 'Decrypt pending'}
          </button>
        </div>
      </div>

      {msg && (
        <div className="status-strip">
          <p>{msg}</p>
        </div>
      )}
    </motion.section>
  );
}
