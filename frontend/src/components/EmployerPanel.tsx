import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarClock,
  CircleCheck,
  Copy,
  LockKeyhole,
  PauseCircle,
  Play,
  RefreshCw,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { useAccount, useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { sepolia } from 'viem/chains';
import { isAddress } from 'viem/utils';
import { getCofheClient } from '../cofhe';
import { fhePayAbi } from '../abi/fhepay';
import { getFhePayAddress } from '../constants';
import { useCofheReady } from '../hooks/useCofheReady';
import { wagmiConfig } from '../wagmi';
import {
  formatDateTime,
  formatDuration,
  formatEtherAmount,
  isUint128,
  parseDecimalToUnits,
  parseWholeNumber,
  shortAddress,
} from '../utils/format';
import { toEncryptedItemInput } from '../utils/cofheInput';

type Address = `0x${string}`;

const UINT64_MAX = (1n << 64n) - 1n;

function parseAddressList(input: string) {
  const seen = new Set<string>();
  const addresses: Address[] = [];
  const invalid: string[] = [];
  let duplicates = 0;

  input
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      if (!isAddress(value)) {
        invalid.push(value);
        return;
      }

      const key = value.toLowerCase();
      if (seen.has(key)) {
        duplicates += 1;
        return;
      }

      seen.add(key);
      addresses.push(value as Address);
    });

  return { addresses, invalid, duplicates };
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
  const [visibleRosterCount, setVisibleRosterCount] = useState(24);

  const employeeAddress = useMemo(
    () => (isAddress(employee) ? (employee as Address) : undefined),
    [employee],
  );
  const parsedBatch = useMemo(() => parseAddressList(batch), [batch]);

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
  const { data: maxBatchSize } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'MAX_BATCH_SIZE',
    query: { enabled: !!contract },
  });
  const { data: canPayroll } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'isPayrollAdmin',
    args: address ? [address] : undefined,
    query: { enabled: !!contract && !!address },
  });
  const { data: canTreasury } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'isTreasuryAdmin',
    args: address ? [address] : undefined,
    query: { enabled: !!contract && !!address },
  });
  const { data: employeeCount, refetch: refetchEmployeeCount } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'employeeCount',
    query: { enabled: !!contract },
  });
  const { data: selectedHasSalary, refetch: refetchSelectedHasSalary } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'hasSalary',
    args: employeeAddress ? [employeeAddress] : undefined,
    query: { enabled: !!contract && !!employeeAddress },
  });
  const { data: selectedActive, refetch: refetchSelectedActive } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'isActiveEmployee',
    args: employeeAddress ? [employeeAddress] : undefined,
    query: { enabled: !!contract && !!employeeAddress },
  });
  const { data: nextPayAt, refetch: refetchNextPayAt } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'nextPayAt',
    args: employeeAddress ? [employeeAddress] : undefined,
    query: { enabled: !!contract && !!employeeAddress },
  });

  const rosterIndexes = useMemo(() => {
    const count = typeof employeeCount === 'bigint' ? Number(employeeCount) : 0;
    return Array.from({ length: Math.min(count, visibleRosterCount) }, (_, index) => index);
  }, [employeeCount, visibleRosterCount]);

  const employeeContracts = useMemo(
    () =>
      contract
        ? rosterIndexes.map((index) => ({
            address: contract,
            abi: fhePayAbi,
            functionName: 'employeeAt',
            args: [BigInt(index)],
          }))
        : [],
    [contract, rosterIndexes],
  );

  const { data: employeeReads, refetch: refetchEmployees } = useReadContracts({
    contracts: employeeContracts,
    query: { enabled: employeeContracts.length > 0 },
  });

  const employeeRoster = useMemo<Address[]>(() => {
    const reads = (employeeReads ?? []) as Array<{ result?: unknown }>;
    return reads
      .map((entry) => entry.result)
      .filter((value: unknown): value is Address => typeof value === 'string' && isAddress(value));
  }, [employeeReads]);

  const maxBatch = typeof maxBatchSize === 'bigint' ? Number(maxBatchSize) : 50;
  const contractDisabled = !contract || !address;
  const payrollDisabled = contractDisabled || canPayroll !== true;
  const treasuryDisabled = contractDisabled || canTreasury !== true;
  const encryptionDisabled = payrollDisabled || !cofheReady;
  const selectedReady = !!employeeAddress && selectedHasSalary === true && selectedActive === true;

  async function waitForHash(hash: `0x${string}`) {
    setLastHash(hash);
    await waitForTransactionReceipt(wagmiConfig, { hash });
  }

  async function refreshReads() {
    await Promise.all([
      refetchTreasury(),
      refetchPayInterval(),
      refetchEmployeeCount(),
      refetchEmployees(),
      employeeAddress ? refetchSelectedHasSalary() : Promise.resolve(),
      employeeAddress ? refetchSelectedActive() : Promise.resolve(),
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
    if (!isUint128(salaryWei)) {
      setMsg('Salary exceeds the euint128 limit.');
      return;
    }

    setBusy('salary');
    try {
      const [{ Encryptable }, cofheClient] = await Promise.all([
        import('@cofhe/sdk'),
        getCofheClient(),
      ]);
      const [enc] = await cofheClient.encryptInputs([Encryptable.uint128(salaryWei)]).execute();
      const encryptedSalary = toEncryptedItemInput(enc);
      const hash = await writeContractAsync({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'setSalary',
        args: [employeeAddress, encryptedSalary],
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
    const minutes = parseWholeNumber(intervalMinutes);
    if (minutes === null || minutes <= 0n) {
      setMsg('Enter a whole number of minutes greater than zero.');
      return;
    }

    const seconds = minutes * 60n;
    if (seconds > UINT64_MAX) {
      setMsg('Pay interval is too large for the contract.');
      return;
    }

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
      setMsg(`Pay interval updated to ${formatDuration(seconds)}.`);
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
    if (parsedBatch.invalid.length > 0) {
      setMsg(`Fix ${parsedBatch.invalid.length} invalid address${parsedBatch.invalid.length === 1 ? '' : 'es'} before running payroll.`);
      return;
    }
    if (parsedBatch.addresses.length === 0) {
      setMsg('Paste at least one valid employee address.');
      return;
    }
    if (parsedBatch.addresses.length > maxBatch) {
      setMsg(`Batch size is capped at ${maxBatch} employees per transaction.`);
      return;
    }

    setBusy('batch');
    try {
      const hash = await writeContractAsync({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'batchPaySalary',
        args: [parsedBatch.addresses],
      });
      await waitForHash(hash);
      await refreshReads();
      setMsg(`Batch payroll submitted for ${parsedBatch.addresses.length} employees; inactive or not-due entries are skipped on-chain.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Batch payroll failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onSetActive(active: boolean) {
    setMsg(null);
    if (!contract || !employeeAddress) {
      setMsg('Enter a valid employee address.');
      return;
    }

    setBusy(active ? 'activate' : 'deactivate');
    try {
      const hash = await writeContractAsync({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'setEmployeeActive',
        args: [employeeAddress, active],
      });
      await waitForHash(hash);
      await refreshReads();
      setMsg(active ? 'Employee reactivated for payroll.' : 'Employee paused for future payroll runs.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not update employee status.');
    } finally {
      setBusy(null);
    }
  }

  function useRosterForBatch() {
    if (employeeRoster.length === 0) {
      setMsg('No on-chain roster entries are loaded yet.');
      return;
    }
    setBatch(employeeRoster.join('\n'));
    setMsg(`Loaded ${employeeRoster.length} roster address${employeeRoster.length === 1 ? '' : 'es'} into the batch box.`);
  }

  function selectRosterEmployee(next: Address) {
    setEmployee(next);
    setMsg(null);
  }

  return (
    <motion.section className="card panel-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Employer command center</p>
          <h2>Payroll operations</h2>
          <p className="prose-muted">Set salaries, fund treasury, and run payroll.</p>
        </div>
        <span className={`status-pill ${cofheReady ? 'status-ok' : 'status-warn'}`}>
          {cofheReady ? <CircleCheck size={14} /> : <RefreshCw size={14} />}
          CoFHE {cofheReady ? 'ready' : 'connecting'}
        </span>
      </div>

      <div className="stats-grid compact-stats">
        <div className="stat-card">
          <span className="label">Treasury</span>
          <strong>{typeof treasuryBalance === 'bigint' ? formatEtherAmount(treasuryBalance) : 'Loading...'}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Pay interval</span>
          <strong>{typeof payInterval === 'bigint' ? formatDuration(payInterval) : 'Loading...'}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Roster</span>
          <strong>{typeof employeeCount === 'bigint' ? `${employeeCount.toString()} employees` : 'Loading...'}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Selected next pay</span>
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
        <div className="notice notice-warn">
          {!contract ? 'Set VITE_FHEPAY_ADDRESS after deployment.' : 'Connect the employer wallet to manage payroll.'}
        </div>
      )}
      {!contractDisabled && canPayroll !== true && (
        <div className="notice notice-warn">
          {canTreasury === true
            ? 'This wallet can fund treasury and manage treasury settings, but cannot run payroll.'
            : 'This wallet is not a payroll admin for the connected contract.'}
        </div>
      )}

      <div className="ops-grid">
        <form onSubmit={onSetSalary} className="surface-form">
          <div className="form-title">
            <LockKeyhole size={18} />
            <h3>Confidential salary</h3>
          </div>
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
              spellCheck={false}
            />
          </div>
          <div className="selected-strip">
            <span>{employeeAddress ? shortAddress(employeeAddress) : 'No valid employee selected'}</span>
            <span className={`status-dot ${selectedReady ? 'dot-ok' : 'dot-muted'}`} />
            <span>
              {selectedHasSalary === true
                ? selectedActive === true
                  ? 'Active payroll'
                  : 'Paused'
                : 'Salary not registered'}
            </span>
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
          <div className="button-row">
            <button type="submit" className="btn" disabled={encryptionDisabled || busy !== null}>
              <LockKeyhole size={16} />
              {busy === 'salary' ? 'Encrypting...' : 'Encrypt and save'}
            </button>
            <button
              type="button"
              className="icon-btn"
              disabled={payrollDisabled || !employeeAddress || selectedHasSalary !== true || busy !== null}
              title={selectedActive ? 'Pause employee' : 'Reactivate employee'}
              onClick={() => void onSetActive(selectedActive !== true)}
            >
              {selectedActive ? <PauseCircle size={18} /> : <UserCheck size={18} />}
            </button>
          </div>
        </form>

        <form onSubmit={onFundTreasury} className="surface-form">
          <div className="form-title">
            <Wallet size={18} />
            <h3>Treasury liquidity</h3>
          </div>
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
          <p className="prose-muted small-copy">Claims settle from this public ETH treasury.</p>
          <button type="submit" className="btn btn-secondary" disabled={treasuryDisabled || busy !== null}>
            <Wallet size={16} />
            {busy === 'treasury' ? 'Funding...' : 'Fund treasury'}
          </button>
        </form>

        <form onSubmit={onUpdateInterval} className="surface-form">
          <div className="form-title">
            <CalendarClock size={18} />
            <h3>Payroll cadence</h3>
          </div>
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
          <p className="prose-muted small-copy">The contract blocks accidental duplicate payments inside the interval.</p>
          <button type="submit" className="btn btn-secondary" disabled={payrollDisabled || busy !== null}>
            <CalendarClock size={16} />
            {busy === 'interval' ? 'Saving...' : 'Update interval'}
          </button>
        </form>
      </div>

      <div className="split-panel">
        <section className="surface-form">
          <div className="form-title">
            <Play size={18} />
            <h3>Run payroll</h3>
          </div>
          <button
            type="button"
            className="btn"
            disabled={payrollDisabled || !employeeAddress || busy !== null}
            onClick={() => void onPayOne()}
          >
            <Play size={16} />
            {busy === 'pay-one' ? 'Paying...' : 'Pay selected employee'}
          </button>
          <div>
            <label className="label" htmlFor="batch">
              Batch payroll addresses
            </label>
            <textarea
              id="batch"
              className="input"
              rows={5}
              placeholder="0xabc...\n0xdef..."
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
            />
          </div>
          <div className="batch-meta">
            <span>{parsedBatch.addresses.length}/{maxBatch} valid</span>
            <span>{parsedBatch.invalid.length} invalid</span>
            <span>{parsedBatch.duplicates} duplicate</span>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={payrollDisabled || busy !== null}
              onClick={() => void onBatchPay()}
            >
              <Users size={16} />
              {busy === 'batch' ? 'Processing...' : 'Run batch'}
            </button>
            <button type="button" className="icon-btn" title="Load on-chain roster" onClick={useRosterForBatch}>
              <Copy size={18} />
            </button>
          </div>
        </section>

        <section className="surface-form roster-panel">
          <div className="form-title">
            <Users size={18} />
            <h3>On-chain roster</h3>
          </div>
          {employeeRoster.length === 0 ? (
            <p className="prose-muted small-copy">Register salaries to populate the roster.</p>
          ) : (
            <>
              <div className="roster-list">
                {employeeRoster.map((item) => (
                  <button type="button" key={item} className="roster-row" onClick={() => selectRosterEmployee(item)}>
                    <span>{shortAddress(item)}</span>
                    <code>{item}</code>
                  </button>
                ))}
              </div>
              {typeof employeeCount === 'bigint' && BigInt(employeeRoster.length) < employeeCount && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setVisibleRosterCount((count) => count + 24)}
                >
                  Load more
                </button>
              )}
            </>
          )}
        </section>
      </div>

      {(msg || lastHash) && (
        <div className="status-strip">
          {msg && <p>{msg}</p>}
          {lastHash && (
            <a href={`https://sepolia.etherscan.io/tx/${lastHash}`} target="_blank" rel="noreferrer">
              Tx: {lastHash}
            </a>
          )}
        </div>
      )}
    </motion.section>
  );
}
