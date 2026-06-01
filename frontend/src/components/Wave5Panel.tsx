import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  CalendarClock,
  Gift,
  KeyRound,
  ShieldCheck,
  Upload,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { useAccount, usePublicClient, useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { sepolia } from 'viem/chains';
import { isAddress } from 'viem/utils';
import { fhePayAbi } from '../abi/fhepay';
import { getCofheClient } from '../cofhe';
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

type CsvRow = {
  line: number;
  employee: Address;
  salaryWei: bigint;
  groupId?: bigint;
};

type PayrollGroupView = {
  id: number;
  name: string;
  interval: bigint;
  lastRunAt: bigint;
  active: boolean;
  memberCount: bigint;
  nextRunAt: bigint;
};

const UINT64_MAX = (1n << 64n) - 1n;

type Wave5PanelProps = {
  isOwner: boolean;
  canOperatePayroll: boolean;
  canOperateTreasury: boolean;
};

function splitCsvLine(line: string) {
  return line
    .split(/[,\t;]/)
    .map((part) => part.trim().replace(/^"|"$/g, ''));
}

function parseCsv(input: string) {
  const rows: CsvRow[] = [];
  const invalid: string[] = [];

  input
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(({ line }) => line.length > 0)
    .forEach(({ line, lineNumber }, index) => {
      const parts = splitCsvLine(line);
      const maybeHeader = index === 0 && parts.some((part) => /address|wallet|salary/i.test(part));
      if (maybeHeader) return;

      const [employeeRaw, salaryRaw, groupRaw] = parts;
      if (!employeeRaw || !isAddress(employeeRaw)) {
        invalid.push(`line ${lineNumber}: invalid employee address`);
        return;
      }

      const salaryWei = parseDecimalToUnits(salaryRaw ?? '', 18);
      if (salaryWei === null || salaryWei <= 0n || !isUint128(salaryWei)) {
        invalid.push(`line ${lineNumber}: invalid salary amount`);
        return;
      }

      let groupId: bigint | undefined;
      if (groupRaw) {
        const parsedGroup = parseWholeNumber(groupRaw);
        if (parsedGroup === null) {
          invalid.push(`line ${lineNumber}: invalid group id`);
          return;
        }
        groupId = parsedGroup;
      }

      rows.push({ line: lineNumber, employee: employeeRaw as Address, salaryWei, groupId });
    });

  return { rows, invalid };
}

function parseGroupInfo(result: unknown, id: number): PayrollGroupView | null {
  if (!Array.isArray(result) || result.length < 6) return null;
  const [name, interval, lastRunAt, active, memberCount, nextRunAt] = result;
  if (typeof name !== 'string' || typeof active !== 'boolean') return null;
  return {
    id,
    name,
    interval: BigInt(String(interval)),
    lastRunAt: BigInt(String(lastRunAt)),
    active,
    memberCount: BigInt(String(memberCount)),
    nextRunAt: BigInt(String(nextRunAt)),
  };
}

export function Wave5Panel({ isOwner, canOperatePayroll, canOperateTreasury }: Wave5PanelProps) {
  const contract = getFhePayAddress();
  const cofheReady = useCofheReady();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [ownerTarget, setOwnerTarget] = useState('');
  const [payrollAdmin, setPayrollAdmin] = useState('');
  const [treasuryAdmin, setTreasuryAdmin] = useState('');
  const [auditor, setAuditor] = useState('');
  const [auditEmployee, setAuditEmployee] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMinutes, setGroupMinutes] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groupActive, setGroupActive] = useState(true);
  const [groupEmployee, setGroupEmployee] = useState('');
  const [bonusEmployee, setBonusEmployee] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [csvInput, setCsvInput] = useState('');
  const [alertAmount, setAlertAmount] = useState('');
  const [averagePayroll, setAveragePayroll] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastHash, setLastHash] = useState<`0x${string}` | null>(null);
  const [visibleGroupCount, setVisibleGroupCount] = useState(12);

  const { data: owner, refetch: refetchOwner } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'owner',
    query: { enabled: !!contract },
  });
  const { data: pendingOwner, refetch: refetchPendingOwner } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'pendingOwner',
    query: { enabled: !!contract },
  });
  const { data: treasuryBalance, refetch: refetchTreasury } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'treasuryBalance',
    query: { enabled: !!contract },
  });
  const { data: treasuryAlertThreshold, refetch: refetchAlertThreshold } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'treasuryAlertThreshold',
    query: { enabled: !!contract },
  });
  const { data: treasuryBelowAlert, refetch: refetchBelowAlert } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'treasuryBelowAlert',
    query: { enabled: !!contract },
  });
  const { data: employeeCount, refetch: refetchEmployeeCount } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'employeeCount',
    query: { enabled: !!contract },
  });
  const { data: payrollGroupCount, refetch: refetchGroupCount } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'payrollGroupCount',
    query: { enabled: !!contract },
  });

  const groupIndexes = useMemo(() => {
    const count = typeof payrollGroupCount === 'bigint' ? Number(payrollGroupCount) : 0;
    return Array.from({ length: Math.min(count, visibleGroupCount) }, (_, index) => index);
  }, [payrollGroupCount, visibleGroupCount]);

  const groupContracts = useMemo(
    () =>
      contract
        ? groupIndexes.map((index) => ({
            address: contract,
            abi: fhePayAbi,
            functionName: 'payrollGroupInfo',
            args: [BigInt(index)],
          }))
        : [],
    [contract, groupIndexes],
  );

  const { data: groupReads, refetch: refetchGroups } = useReadContracts({
    contracts: groupContracts,
    query: { enabled: groupContracts.length > 0 },
  });

  const groups = useMemo(() => {
    const reads = (groupReads ?? []) as Array<{ result?: unknown }>;
    return reads
      .map((entry, index) => parseGroupInfo(entry.result, groupIndexes[index] ?? index))
      .filter((group): group is PayrollGroupView => group !== null);
  }, [groupIndexes, groupReads]);

  const csv = useMemo(() => parseCsv(csvInput), [csvInput]);
  const estimatedPayrollLoad = useMemo(() => {
    const avg = parseDecimalToUnits(averagePayroll, 18);
    const count = typeof employeeCount === 'bigint' ? employeeCount : 0n;
    if (avg === null || avg <= 0n || count <= 0n) return null;
    return avg * count;
  }, [averagePayroll, employeeCount]);
  const estimatedRunway =
    typeof treasuryBalance === 'bigint' && estimatedPayrollLoad && estimatedPayrollLoad > 0n
      ? Number(treasuryBalance / estimatedPayrollLoad)
      : null;
  const pendingOwnerAddress = typeof pendingOwner === 'string' && isAddress(pendingOwner) ? pendingOwner : undefined;
  const hasPendingOwner = !!pendingOwnerAddress && pendingOwnerAddress !== '0x0000000000000000000000000000000000000000';
  const canAcceptOwnership =
    !!address && !!pendingOwnerAddress && pendingOwnerAddress.toLowerCase() === address.toLowerCase();

  const disabled = !contract || !address || busy !== null;
  const governanceDisabled = disabled || !isOwner;
  const payrollDisabled = disabled || !canOperatePayroll;
  const treasuryDisabled = disabled || !canOperateTreasury;

  async function waitForHash(hash: `0x${string}`) {
    setLastHash(hash);
    await waitForTransactionReceipt(wagmiConfig, { hash });
  }

  async function refreshReads() {
    await Promise.all([
      refetchOwner(),
      refetchPendingOwner(),
      refetchTreasury(),
      refetchAlertThreshold(),
      refetchBelowAlert(),
      refetchEmployeeCount(),
      refetchGroupCount(),
      refetchGroups(),
    ]);
  }

  async function writeAndWait(params: Parameters<typeof writeContractAsync>[0]) {
    const hash = await writeContractAsync(params);
    await waitForHash(hash);
    return hash;
  }

  function parseIntervalSeconds(value: string) {
    const minutes = parseWholeNumber(value);
    if (minutes === null || minutes <= 0n) return null;
    const seconds = minutes * 60n;
    if (seconds > UINT64_MAX) return null;
    return seconds;
  }

  async function onTransferOwnership(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!contract || !isOwner || !isAddress(ownerTarget)) {
      setMsg(isOwner ? 'Enter a valid Safe or multisig owner address.' : 'Only the current owner can start ownership transfer.');
      return;
    }

    setBusy('owner');
    try {
      await writeAndWait({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'transferOwnership',
        args: [ownerTarget as Address],
      });
      await refreshReads();
      setMsg(`Ownership transfer started for ${shortAddress(ownerTarget)}. The pending owner must accept it.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Ownership transfer failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onAcceptOwnership() {
    setMsg(null);
    if (!contract || !canAcceptOwnership) {
      setMsg('Connect the pending owner wallet to accept ownership.');
      return;
    }

    setBusy('owner-accept');
    try {
      await writeAndWait({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'acceptOwnership',
      });
      await refreshReads();
      setMsg('Ownership accepted for the connected wallet.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Ownership acceptance failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onSetRole(kind: 'payroll' | 'treasury' | 'auditor', account: string, allowed: boolean) {
    setMsg(null);
    if (!contract || !isOwner || !isAddress(account)) {
      setMsg(isOwner ? 'Enter a valid role account address.' : 'Only the owner can update roles.');
      return;
    }

    const functionName =
      kind === 'payroll' ? 'setPayrollAdmin' : kind === 'treasury' ? 'setTreasuryAdmin' : 'setAuditor';

    setBusy(`${kind}-${allowed ? 'grant' : 'remove'}`);
    try {
      await writeAndWait({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName,
        args: [account as Address, allowed],
      });
      await refreshReads();
      setMsg(`${kind === 'auditor' ? 'Auditor' : `${kind} admin`} ${allowed ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Role update failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onGrantAuditorAccess(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!contract || !canOperatePayroll || !isAddress(auditor) || !isAddress(auditEmployee)) {
      setMsg(canOperatePayroll ? 'Enter valid auditor and employee addresses.' : 'Only payroll admins can grant auditor access.');
      return;
    }

    setBusy('audit-grant');
    try {
      await writeAndWait({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'grantAuditorAccess',
        args: [auditor as Address, auditEmployee as Address],
      });
      setMsg(`Auditor access granted for ${shortAddress(auditEmployee)}.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Auditor access grant failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onRevokeAuditorAccess() {
    setMsg(null);
    if (!contract || !canOperatePayroll || !isAddress(auditor) || !isAddress(auditEmployee)) {
      setMsg(canOperatePayroll ? 'Enter valid auditor and employee addresses.' : 'Only payroll admins can revoke auditor access.');
      return;
    }

    setBusy('audit-revoke');
    try {
      await writeAndWait({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'revokeAuditorAccess',
        args: [auditor as Address, auditEmployee as Address],
      });
      setMsg(`Future auditor access revoked for ${shortAddress(auditEmployee)}.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Auditor access revoke failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!contract || !canOperatePayroll) {
      setMsg('Only payroll admins can create payroll groups.');
      return;
    }

    const intervalSeconds = parseIntervalSeconds(groupMinutes);
    if (groupName.trim().length === 0 || intervalSeconds === null) {
      setMsg('Enter a group name and a valid cadence in minutes.');
      return;
    }

    setBusy('group-create');
    try {
      await writeAndWait({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'createPayrollGroup',
        args: [groupName.trim(), intervalSeconds],
      });
      await refreshReads();
      setMsg(`Created payroll group "${groupName.trim()}".`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not create payroll group.');
    } finally {
      setBusy(null);
    }
  }

  async function onUpdateGroup(active: boolean) {
    setMsg(null);
    if (!contract || !canOperatePayroll) {
      setMsg('Only payroll admins can update payroll groups.');
      return;
    }

    const parsedGroupId = parseWholeNumber(groupId);
    const intervalSeconds = parseIntervalSeconds(groupMinutes);
    if (parsedGroupId === null || groupName.trim().length === 0 || intervalSeconds === null) {
      setMsg('Select a group and enter a name plus cadence in minutes.');
      return;
    }

    setBusy(active ? 'group-update' : 'group-pause');
    try {
      await writeAndWait({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'setPayrollGroup',
        args: [parsedGroupId, groupName.trim(), intervalSeconds, active],
      });
      setGroupActive(active);
      await refreshReads();
      setMsg(`Group ${parsedGroupId} ${active ? 'updated' : 'paused'}.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Group update failed.');
    } finally {
      setBusy(null);
    }
  }

  function selectGroup(group: PayrollGroupView) {
    setGroupId(String(group.id));
    setGroupName(group.name);
    setGroupMinutes(String(group.interval / 60n));
    setGroupActive(group.active);
    setMsg(null);
  }

  async function onSetGroupMember(included: boolean) {
    setMsg(null);
    if (!contract || !canOperatePayroll || !isAddress(groupEmployee)) {
      setMsg(canOperatePayroll ? 'Enter a valid group employee address.' : 'Only payroll admins can update group membership.');
      return;
    }
    const parsedGroupId = parseWholeNumber(groupId);
    if (parsedGroupId === null) {
      setMsg('Enter a valid group id.');
      return;
    }

    setBusy(included ? 'group-add' : 'group-remove');
    try {
      await writeAndWait({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'setPayrollGroupMember',
        args: [parsedGroupId, groupEmployee as Address, included],
      });
      await refreshReads();
      setMsg(`${shortAddress(groupEmployee)} ${included ? 'added to' : 'removed from'} group ${parsedGroupId}.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Group membership update failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onRunGroup() {
    setMsg(null);
    if (!contract || !canOperatePayroll) {
      setMsg('Only payroll admins can run payroll groups.');
      return;
    }
    const parsedGroupId = parseWholeNumber(groupId);
    if (parsedGroupId === null) {
      setMsg('Enter a valid group id.');
      return;
    }

    setBusy('group-run');
    try {
      await writeAndWait({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'payPayrollGroup',
        args: [parsedGroupId],
      });
      await refreshReads();
      setMsg(`Payroll group ${parsedGroupId} executed.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Group payroll failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onGrantBonus(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!contract || !canOperatePayroll || !isAddress(bonusEmployee) || !cofheReady) {
      setMsg(canOperatePayroll ? 'Enter a valid employee and wait for CoFHE readiness.' : 'Only payroll admins can grant bonuses.');
      return;
    }

    const amountWei = parseDecimalToUnits(bonusAmount, 18);
    if (amountWei === null || amountWei <= 0n || !isUint128(amountWei)) {
      setMsg('Enter a valid bonus amount.');
      return;
    }

    setBusy('bonus');
    try {
      const [{ Encryptable }, cofheClient] = await Promise.all([
        import('@cofhe/sdk'),
        getCofheClient(),
      ]);
      const [enc] = await cofheClient.encryptInputs([Encryptable.uint128(amountWei)]).execute();
      const encryptedAmount = toEncryptedItemInput(enc);
      await writeAndWait({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'grantBonus',
        args: [bonusEmployee as Address, encryptedAmount],
      });
      await refreshReads();
      setMsg(`Granted ${formatEtherAmount(amountWei)} confidentially.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Bonus grant failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onImportCsv(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!contract || !canOperatePayroll || !publicClient || !cofheReady) {
      setMsg(canOperatePayroll ? 'Connect an operator wallet and wait for CoFHE readiness.' : 'Only payroll admins can import salaries.');
      return;
    }
    if (csv.invalid.length > 0) {
      setMsg(`Fix CSV errors first: ${csv.invalid.slice(0, 2).join('; ')}`);
      return;
    }
    if (csv.rows.length === 0) {
      setMsg('Paste CSV rows with address,salaryEth,groupId(optional).');
      return;
    }

    setBusy('csv');
    try {
      const [{ Encryptable }, cofheClient] = await Promise.all([
        import('@cofhe/sdk'),
        getCofheClient(),
      ]);
      let txCount = 0;
      for (const row of csv.rows) {
        const [enc] = await cofheClient.encryptInputs([Encryptable.uint128(row.salaryWei)]).execute();
        const encryptedSalary = toEncryptedItemInput(enc);
        await writeAndWait({
          address: contract,
          abi: fhePayAbi,
          chainId: sepolia.id,
          functionName: 'setSalary',
          args: [row.employee, encryptedSalary],
        });
        txCount += 1;

        if (row.groupId !== undefined) {
          const alreadyMember = Boolean(await publicClient.readContract({
            address: contract,
            abi: fhePayAbi,
            functionName: 'isPayrollGroupMember',
            args: [row.groupId, row.employee],
          }));
          if (!alreadyMember) {
            await writeAndWait({
              address: contract,
              abi: fhePayAbi,
              chainId: sepolia.id,
              functionName: 'setPayrollGroupMember',
              args: [row.groupId, row.employee, true],
            });
            txCount += 1;
          }
        }
      }

      await refreshReads();
      setMsg(`Imported ${csv.rows.length} salaries with ${txCount} on-chain transaction${txCount === 1 ? '' : 's'}.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'CSV import failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onSetAlertThreshold(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!contract || !canOperateTreasury) {
      setMsg('Only treasury admins can update treasury alerts.');
      return;
    }
    const thresholdWei = parseDecimalToUnits(alertAmount, 18);
    if (thresholdWei === null || thresholdWei < 0n) {
      setMsg('Enter a valid alert threshold.');
      return;
    }

    setBusy('alert');
    try {
      await writeAndWait({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'setTreasuryAlertThreshold',
        args: [thresholdWei],
      });
      await refreshReads();
      setMsg(`Treasury alert threshold set to ${formatEtherAmount(thresholdWei)}.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Treasury alert update failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <motion.section className="card panel-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Wave 5 controls</p>
          <h2>Governance, groups, audit, and automation</h2>
          <p className="prose-muted">Safe handoff, roles, groups, bonuses, CSV, and alerts.</p>
        </div>
        <span className={`status-pill ${treasuryBelowAlert ? 'status-warn' : 'status-ok'}`}>
          <WalletCards size={14} />
          {treasuryBelowAlert ? 'Funding alert' : 'Treasury ok'}
        </span>
      </div>

      <div className="stats-grid compact-stats">
        <div className="stat-card">
          <span className="label">Owner</span>
          <strong>{owner ? shortAddress(String(owner)) : 'Loading...'}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Pending owner</span>
          <strong>{hasPendingOwner ? shortAddress(pendingOwnerAddress) : 'None'}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Alert threshold</span>
          <strong>
            {typeof treasuryAlertThreshold === 'bigint' ? formatEtherAmount(treasuryAlertThreshold) : 'Loading...'}
          </strong>
        </div>
        <div className="stat-card">
          <span className="label">Estimated runway</span>
          <strong>{estimatedRunway == null ? 'Add average pay' : `${estimatedRunway} pay periods`}</strong>
        </div>
      </div>

      <div className="ops-grid">
        <form onSubmit={onTransferOwnership} className="surface-form">
          <div className="form-title">
            <ShieldCheck size={18} />
            <h3>Safe-ready ownership</h3>
          </div>
          <div>
            <label className="label" htmlFor="owner-target">
              New owner or Safe
            </label>
            <input
              id="owner-target"
              className="input"
              placeholder="0x..."
              value={ownerTarget}
              onChange={(e) => setOwnerTarget(e.target.value)}
              spellCheck={false}
            />
          </div>
          <button type="submit" className="btn btn-secondary" disabled={governanceDisabled}>
            <ShieldCheck size={16} />
            {busy === 'owner' ? 'Submitting...' : 'Start transfer'}
          </button>
          <button type="button" className="btn" disabled={disabled || !canAcceptOwnership} onClick={() => void onAcceptOwnership()}>
            <BadgeCheck size={16} />
            {busy === 'owner-accept' ? 'Accepting...' : 'Accept ownership'}
          </button>
        </form>

        <section className="surface-form">
          <div className="form-title">
            <KeyRound size={18} />
            <h3>Delegated admins</h3>
          </div>
          <div>
            <label className="label" htmlFor="payroll-admin">
              Payroll admin
            </label>
            <input
              id="payroll-admin"
              className="input"
              placeholder="0x..."
              value={payrollAdmin}
              onChange={(e) => setPayrollAdmin(e.target.value)}
              spellCheck={false}
            />
          </div>
          <div className="button-row">
            <button type="button" className="btn btn-secondary" disabled={governanceDisabled} onClick={() => void onSetRole('payroll', payrollAdmin, true)}>
              Grant
            </button>
            <button type="button" className="btn btn-secondary" disabled={governanceDisabled} onClick={() => void onSetRole('payroll', payrollAdmin, false)}>
              Remove
            </button>
          </div>
          <div>
            <label className="label" htmlFor="treasury-admin">
              Treasury admin
            </label>
            <input
              id="treasury-admin"
              className="input"
              placeholder="0x..."
              value={treasuryAdmin}
              onChange={(e) => setTreasuryAdmin(e.target.value)}
              spellCheck={false}
            />
          </div>
          <div className="button-row">
            <button type="button" className="btn btn-secondary" disabled={governanceDisabled} onClick={() => void onSetRole('treasury', treasuryAdmin, true)}>
              Grant
            </button>
            <button type="button" className="btn btn-secondary" disabled={governanceDisabled} onClick={() => void onSetRole('treasury', treasuryAdmin, false)}>
              Remove
            </button>
          </div>
        </section>

        <form onSubmit={onGrantAuditorAccess} className="surface-form">
          <div className="form-title">
            <BadgeCheck size={18} />
            <h3>Auditor disclosure</h3>
          </div>
          <div>
            <label className="label" htmlFor="auditor-address">
              Auditor address
            </label>
            <input
              id="auditor-address"
              className="input"
              placeholder="0x..."
              value={auditor}
              onChange={(e) => setAuditor(e.target.value)}
              spellCheck={false}
            />
          </div>
          <div className="button-row">
            <button type="button" className="btn btn-secondary" disabled={governanceDisabled} onClick={() => void onSetRole('auditor', auditor, true)}>
              Enable
            </button>
            <button type="button" className="btn btn-secondary" disabled={governanceDisabled} onClick={() => void onSetRole('auditor', auditor, false)}>
              Disable role
            </button>
          </div>
          <div>
            <label className="label" htmlFor="audit-employee">
              Employee to disclose
            </label>
            <input
              id="audit-employee"
              className="input"
              placeholder="0x..."
              value={auditEmployee}
              onChange={(e) => setAuditEmployee(e.target.value)}
              spellCheck={false}
            />
          </div>
          <button type="submit" className="btn" disabled={payrollDisabled}>
            <BadgeCheck size={16} />
            {busy === 'audit-grant' ? 'Granting...' : 'Grant access'}
          </button>
          <button type="button" className="btn btn-secondary" disabled={payrollDisabled} onClick={() => void onRevokeAuditorAccess()}>
            {busy === 'audit-revoke' ? 'Revoking...' : 'Revoke app access'}
          </button>
          <p className="prose-muted small-copy">
            Revoke stops future app-level disclosure. CoFHE grants already written to old ciphertext handles remain historical access.
          </p>
        </form>
      </div>

      <div className="split-panel">
        <section className="surface-form">
          <form onSubmit={onCreateGroup} className="inline-form">
            <div className="form-title">
              <UsersRound size={18} />
              <h3>Payroll groups</h3>
            </div>
            <div>
              <label className="label" htmlFor="group-name">
                New group name
              </label>
              <input
                id="group-name"
                className="input"
                placeholder="Engineering"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="group-minutes">
                Cadence in minutes
              </label>
              <input
                id="group-minutes"
                className="input"
                placeholder="43200"
                value={groupMinutes}
                onChange={(e) => setGroupMinutes(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={payrollDisabled}>
              <UsersRound size={16} />
              {busy === 'group-create' ? 'Creating...' : 'Create group'}
            </button>
          </form>

          <div>
            <label className="label" htmlFor="group-id">
              Group id
            </label>
            <input
              id="group-id"
              className="input"
              placeholder="0"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <label className="toggle-line" htmlFor="group-active">
            <input
              id="group-active"
              type="checkbox"
              checked={groupActive}
              onChange={(e) => setGroupActive(e.target.checked)}
            />
            Active group
          </label>
          <div>
            <label className="label" htmlFor="group-employee">
              Group employee
            </label>
            <input
              id="group-employee"
              className="input"
              placeholder="0x..."
              value={groupEmployee}
              onChange={(e) => setGroupEmployee(e.target.value)}
              spellCheck={false}
            />
          </div>
          <div className="button-row">
            <button type="button" className="btn btn-secondary" disabled={payrollDisabled} onClick={() => void onUpdateGroup(groupActive)}>
              Save group
            </button>
            <button type="button" className="btn btn-secondary" disabled={payrollDisabled} onClick={() => void onUpdateGroup(false)}>
              Pause
            </button>
            <button type="button" className="btn btn-secondary" disabled={payrollDisabled} onClick={() => void onSetGroupMember(true)}>
              Add
            </button>
            <button type="button" className="btn btn-secondary" disabled={payrollDisabled} onClick={() => void onSetGroupMember(false)}>
              Remove
            </button>
            <button type="button" className="btn" disabled={payrollDisabled} onClick={() => void onRunGroup()}>
              <CalendarClock size={16} />
              {busy === 'group-run' ? 'Running...' : 'Run due group'}
            </button>
          </div>
        </section>

        <section className="surface-form roster-panel">
          <div className="form-title">
            <CalendarClock size={18} />
            <h3>Group schedules</h3>
          </div>
          {groups.length === 0 ? (
            <p className="prose-muted small-copy">Create a group to schedule recurring payroll runs.</p>
          ) : (
            <>
              <div className="roster-list">
                {groups.map((group) => (
                  <button
                    type="button"
                    key={group.id}
                    className="roster-row"
                    onClick={() => selectGroup(group)}
                  >
                    <span>
                      #{group.id} {group.name} - {group.active ? 'active' : 'paused'}
                    </span>
                    <code>
                      {group.memberCount.toString()} members | every {formatDuration(group.interval)} | next{' '}
                      {formatDateTime(group.nextRunAt)}
                    </code>
                  </button>
                ))}
              </div>
              {typeof payrollGroupCount === 'bigint' && BigInt(groups.length) < payrollGroupCount && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setVisibleGroupCount((count) => count + 12)}
                >
                  Load more
                </button>
              )}
            </>
          )}
        </section>
      </div>

      <div className="split-panel">
        <form onSubmit={onGrantBonus} className="surface-form">
          <div className="form-title">
            <Gift size={18} />
            <h3>Confidential bonus</h3>
          </div>
          <div>
            <label className="label" htmlFor="bonus-employee">
              Employee address
            </label>
            <input
              id="bonus-employee"
              className="input"
              placeholder="0x..."
              value={bonusEmployee}
              onChange={(e) => setBonusEmployee(e.target.value)}
              spellCheck={false}
            />
          </div>
          <div>
            <label className="label" htmlFor="bonus-amount">
              Bonus amount (ETH)
            </label>
            <input
              id="bonus-amount"
              className="input"
              placeholder="0.01"
              value={bonusAmount}
              onChange={(e) => setBonusAmount(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <button type="submit" className="btn" disabled={payrollDisabled || !cofheReady}>
            <Gift size={16} />
            {busy === 'bonus' ? 'Encrypting...' : 'Encrypt and grant'}
          </button>
        </form>

        <form onSubmit={onSetAlertThreshold} className="surface-form">
          <div className="form-title">
            <WalletCards size={18} />
            <h3>Treasury analytics</h3>
          </div>
          <div>
            <label className="label" htmlFor="alert-threshold">
              Alert threshold (ETH)
            </label>
            <input
              id="alert-threshold"
              className="input"
              placeholder="1.0"
              value={alertAmount}
              onChange={(e) => setAlertAmount(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="label" htmlFor="average-payroll">
              Average payroll per employee (ETH)
            </label>
            <input
              id="average-payroll"
              className="input"
              placeholder="0.05"
              value={averagePayroll}
              onChange={(e) => setAveragePayroll(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <p className="prose-muted small-copy">
            Estimated upcoming load:{' '}
            {estimatedPayrollLoad == null ? 'enter an average' : formatEtherAmount(estimatedPayrollLoad)}
          </p>
          <button type="submit" className="btn btn-secondary" disabled={treasuryDisabled}>
            <WalletCards size={16} />
            {busy === 'alert' ? 'Saving...' : 'Set alert threshold'}
          </button>
        </form>
      </div>

      <form onSubmit={onImportCsv} className="surface-form csv-import-form">
        <div className="form-title">
          <Upload size={18} />
          <h3>CSV employee import</h3>
        </div>
        <textarea
          className="input"
          rows={6}
          placeholder={'address,salaryEth,groupId\n0xabc...,0.05,0\n0xdef...,0.08,0'}
          value={csvInput}
          onChange={(e) => setCsvInput(e.target.value)}
          spellCheck={false}
        />
        <div className="batch-meta">
          <span>{csv.rows.length} valid rows</span>
          <span>{csv.invalid.length} errors</span>
          <span>group id optional</span>
        </div>
        {csv.invalid.length > 0 && <p className="prose-muted small-copy">{csv.invalid.slice(0, 3).join('; ')}</p>}
        <button type="submit" className="btn" disabled={payrollDisabled || !cofheReady}>
          <Upload size={16} />
          {busy === 'csv' ? 'Importing...' : 'Encrypt and import CSV'}
        </button>
      </form>

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
