import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Encryptable, assertCorrectEncryptedItemInput } from '@cofhe/sdk';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { sepolia } from 'viem/chains';
import { isAddress } from 'viem/utils';
import { cofheClient } from '../cofhe';
import { fhePayAbi } from '../abi/fhepay';
import { getFhePayAddress } from '../constants';
import { useCofheReady } from '../hooks/useCofheReady';
import { wagmiConfig } from '../wagmi';
import { formatDateTime, formatDuration, formatEtherAmount, parseDecimalToUnits } from '../utils/format';

type Address = `0x${string}`;

function parseAddressList(input: string): Address[] {
  return input
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter((value): value is Address => isAddress(value));
}

export function EmployerPanel() {
  const contract = getFhePayAddress();
  const cofheReady = useCofheReady();
  const { address } = useAccount();
  const [employee, setEmployee] = useState('');
  const [salary, setSalary] = useState('');
  const [batch, setBatch] = useState('');
  const [treasuryAmount, setTreasuryAmount] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastHash, setLastHash] = useState<`0x${string}` | null>(null);

  const employeeAddress = useMemo(
    () => (isAddress(employee) ? (employee as Address) : undefined),
    [employee],
  );

  const { writeContractAsync } = useWriteContract();
  const { data: treasuryBalance, refetch: refetchTreasury } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'treasuryBalance',
    query: { enabled: !!contract },
  });
  const { data: payInterval, refetch: refetchPayInterval } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'payInterval',
    query: { enabled: !!contract },
  });
  const { data: nextPayAt, refetch: refetchNextPayAt } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'nextPayAt',
    args: employeeAddress ? [employeeAddress] : undefined,
    query: { enabled: !!contract && !!employeeAddress },
  });

  const contractDisabled = !contract || !address;
  const encryptionDisabled = contractDisabled || !cofheReady;

  async function waitForHash(hash: `0x${string}`) {
    setLastHash(hash);
    await waitForTransactionReceipt(wagmiConfig, { hash });
  }

  async function refreshReads() {
    await Promise.all([
      refetchTreasury(),
      refetchPayInterval(),
      employeeAddress ? refetchNextPayAt() : Promise.resolve(),
    ]);
  }

  async function onSetSalary(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!contract || !employeeAddress) {
      setMsg('Enter a valid employee address.');
      return;
    }

    const salaryWei = parseDecimalToUnits(salary, 18);
    if (salaryWei === null || salaryWei <= 0n) {
      setMsg('Enter a valid ETH salary amount.');
      return;
    }

    setBusy('salary');
    try {
      const [enc] = await cofheClient.encryptInputs([Encryptable.uint128(salaryWei)]).execute();
      assertCorrectEncryptedItemInput(enc);
      const hash = await writeContractAsync({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'setSalary',
        args: [employeeAddress, enc],
      });
      await waitForHash(hash);
      await refreshReads();
      setMsg(`Salary saved at ${formatEtherAmount(salaryWei)} per pay period.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed to set salary.');
    } finally {
      setBusy(null);
    }
  }

  async function onFundTreasury(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!contract) return;
    const amountWei = parseDecimalToUnits(treasuryAmount, 18);
    if (amountWei === null || amountWei <= 0n) {
      setMsg('Enter a valid ETH amount to fund the treasury.');
      return;
    }

    setBusy('treasury');
    try {
      const hash = await writeContractAsync({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'fundTreasury',
        value: amountWei,
      });
      await waitForHash(hash);
      await refreshReads();
      setMsg(`Treasury funded with ${formatEtherAmount(amountWei)}.`);
      setTreasuryAmount('');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Funding failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onUpdateInterval(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!contract) return;
    const minutes = Number(intervalMinutes.trim());
    if (!Number.isFinite(minutes) || !Number.isInteger(minutes) || minutes <= 0) {
      setMsg('Enter a whole number of minutes greater than zero.');
      return;
    }

    const seconds = BigInt(minutes * 60);
    setBusy('interval');
    try {
      const hash = await writeContractAsync({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'setPayInterval',
        args: [seconds],
      });
      await waitForHash(hash);
      await refreshReads();
      setMsg(`Pay interval updated to ${formatDuration(minutes * 60)}.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed to update pay interval.');
    } finally {
      setBusy(null);
    }
  }

  async function onPayOne() {
    setMsg(null);

    if (!contract || !employeeAddress) {
      setMsg('Enter a valid employee address.');
      return;
    }

    setBusy('pay-one');
    try {
      const hash = await writeContractAsync({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'paySalary',
        args: [employeeAddress],
      });
      await waitForHash(hash);
      await refreshReads();
      setMsg('Payroll executed for the selected employee.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Payroll failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onBatchPay() {
    setMsg(null);

    if (!contract) return;
    const employees = parseAddressList(batch);
    if (employees.length === 0) {
      setMsg('Paste at least one valid employee address.');
      return;
    }

    setBusy('batch');
    try {
      const hash = await writeContractAsync({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'batchPaySalary',
        args: [employees],
      });
      await waitForHash(hash);
      await refreshReads();
      setMsg(`Batch payroll confirmed for ${employees.length} employees.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Batch payroll failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <motion.section
      className="card"
      style={{ marginTop: '1rem' }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="panel-head">
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Outfit, sans-serif' }}>Employer console</h2>
          <p className="prose-muted" style={{ margin: '0.45rem 0 0' }}>
            Run payroll from a funded treasury, enforce pay cycles, and keep salary amounts encrypted until an employee
            chooses to claim funds.
          </p>
        </div>
        <span className="badge" style={{ color: cofheReady ? 'var(--accent)' : 'rgba(255,255,255,0.55)' }}>
          CoFHE {cofheReady ? 'ready' : 'connecting'}
        </span>
      </div>

      <div className="stats-grid" style={{ marginTop: '1rem' }}>
        <div className="stat-card">
          <span className="label">Treasury</span>
          <strong>{typeof treasuryBalance === 'bigint' ? formatEtherAmount(treasuryBalance) : 'Loading...'}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Pay interval</span>
          <strong>{typeof payInterval === 'bigint' ? formatDuration(payInterval) : 'Loading...'}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Next selected payout</span>
          <strong>
            {employeeAddress
              ? typeof nextPayAt === 'bigint'
                ? formatDateTime(nextPayAt)
                : 'Loading...'
              : 'Select employee'}
          </strong>
        </div>
      </div>

      {contractDisabled && (
        <p style={{ color: '#ffb6c1', marginTop: '1rem' }}>
          {!contract ? 'Set VITE_FHEPAY_ADDRESS after deployment.' : 'Connect the employer wallet to manage payroll.'}
        </p>
      )}

      <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
        <form onSubmit={onSetSalary} className="stack-form">
          <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '0.65rem' }}>
            Set confidential salary
          </h3>
          <div>
            <label className="label" htmlFor="emp">
              Employee address
            </label>
            <input
              id="emp"
              className="input"
              placeholder="0x..."
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label" htmlFor="salary">
              Salary per period (ETH)
            </label>
            <input
              id="salary"
              className="input"
              placeholder="0.05"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <button type="submit" className="btn" disabled={encryptionDisabled || busy !== null}>
            {busy === 'salary' ? 'Encrypting...' : 'Encrypt & save salary'}
          </button>
        </form>

        <form onSubmit={onFundTreasury} className="stack-form">
          <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '0.65rem' }}>
            Fund payroll treasury
          </h3>
          <div>
            <label className="label" htmlFor="treasury">
              Deposit ETH
            </label>
            <input
              id="treasury"
              className="input"
              placeholder="1.0"
              value={treasuryAmount}
              onChange={(e) => setTreasuryAmount(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <p className="prose-muted" style={{ margin: 0, fontSize: '0.92rem' }}>
            Claimed withdrawals are settled from this ETH treasury.
          </p>
          <button type="submit" className="btn btn-ghost" disabled={contractDisabled || busy !== null}>
            {busy === 'treasury' ? 'Funding...' : 'Fund treasury'}
          </button>
        </form>
      </div>

      <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
        <form onSubmit={onUpdateInterval} className="stack-form">
          <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '0.65rem' }}>
            Payroll cadence
          </h3>
          <div>
            <label className="label" htmlFor="interval">
              Minutes between payroll runs
            </label>
            <input
              id="interval"
              className="input"
              placeholder="43200"
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <button type="submit" className="btn btn-ghost" disabled={contractDisabled || busy !== null}>
            {busy === 'interval' ? 'Saving...' : 'Update interval'}
          </button>
        </form>

        <div className="stack-form">
          <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '0.65rem' }}>
            Run payroll
          </h3>
          <button
            type="button"
            className="btn"
            disabled={contractDisabled || !employeeAddress || busy !== null}
            onClick={() => void onPayOne()}
          >
            {busy === 'pay-one' ? 'Paying...' : 'Pay selected employee'}
          </button>
          <div>
            <label className="label" htmlFor="batch">
              Batch payroll addresses
            </label>
            <textarea
              id="batch"
              className="input"
              rows={4}
              placeholder="0xabc..., 0xdef..."
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={contractDisabled || busy !== null}
            onClick={() => void onBatchPay()}
          >
            {busy === 'batch' ? 'Processing batch...' : 'Run single-tx batch payroll'}
          </button>
        </div>
      </div>

      {(msg || lastHash) && (
        <div className="status-strip" style={{ marginTop: '1rem' }}>
          {msg && <p style={{ margin: 0 }}>{msg}</p>}
          {lastHash && (
            <code style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
              Tx: {lastHash}
            </code>
          )}
        </div>
      )}
    </motion.section>
  );
}
