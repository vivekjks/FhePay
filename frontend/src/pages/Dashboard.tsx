import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UserRoundCog,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useAccount, useChainId, useReadContract } from 'wagmi';
import { sepolia } from 'viem/chains';
import { ConnectBar } from '../components/ConnectBar';
import { ContractStatus } from '../components/ContractStatus';
import { EmployerPanel } from '../components/EmployerPanel';
import { EmployeePanel } from '../components/EmployeePanel';
import { ActivityLog } from '../components/ActivityLog';
import { Wave5Panel } from '../components/Wave5Panel';
import { AuditorPanel } from '../components/AuditorPanel';
import { fhePayAbi } from '../abi/fhepay';
import { getFhePayAddress } from '../constants';
import { useCofheReady } from '../hooks/useCofheReady';

type WorkspaceId = 'payroll' | 'advanced' | 'auditor' | 'employee' | 'activity';

type WorkspaceConfig = {
  id: WorkspaceId;
  label: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  available: boolean;
};

export function Dashboard() {
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceId | null>(null);
  const cofheReady = useCofheReady();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contract = getFhePayAddress();

  const { data: owner } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'owner',
    query: { enabled: !!contract },
  });
  const { data: pendingOwner } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'pendingOwner',
    query: { enabled: !!contract },
  });
  const { data: isPayrollAdmin } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'isPayrollAdmin',
    args: address ? [address] : undefined,
    query: { enabled: !!contract && !!address },
  });
  const { data: isTreasuryAdmin } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'isTreasuryAdmin',
    args: address ? [address] : undefined,
    query: { enabled: !!contract && !!address },
  });
  const { data: isAuditorRole } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'isAuditor',
    args: address ? [address] : undefined,
    query: { enabled: !!contract && !!address },
  });

  const isOwner =
    !!owner &&
    !!address &&
    (owner as string).toLowerCase() === address.toLowerCase();
  const isPendingOwner =
    !!pendingOwner &&
    !!address &&
    (pendingOwner as string).toLowerCase() === address.toLowerCase();
  const canOperatePayroll = isOwner || isPayrollAdmin === true;
  const canOperateTreasury = isOwner || isTreasuryAdmin === true;
  const isOperator = canOperatePayroll || canOperateTreasury;
  const canUseManagementPanel = isOperator || isPendingOwner;
  const onSepolia = chainId === sepolia.id;
  const roleLabel = !isConnected
    ? 'Pending'
    : isOwner
      ? 'Owner'
      : isPendingOwner
        ? 'Pending owner'
      : canOperatePayroll
        ? 'Payroll admin'
        : canOperateTreasury
          ? 'Treasury admin'
          : isAuditorRole
            ? 'Auditor'
          : 'Employee';

  const workspaces = useMemo(() => {
    if (!isConnected || !contract) return [];

    const items: WorkspaceConfig[] = [
      {
        id: 'payroll',
        label: 'Payroll',
        eyebrow: 'Employer command center',
        description: 'Set salaries, fund treasury, and run payroll without mixing in every advanced control.',
        icon: BriefcaseBusiness,
        available: canOperatePayroll || canOperateTreasury,
      },
      {
        id: 'advanced',
        label: 'Wave 5',
        eyebrow: 'Governance and operations',
        description: 'Roles, Safe handoff, groups, CSV import, bonuses, auditors, automation, and treasury alerts.',
        icon: SlidersHorizontal,
        available: canUseManagementPanel,
      },
      {
        id: 'auditor',
        label: 'Auditor',
        eyebrow: 'Selective disclosure',
        description: 'Decrypt only the employee handles explicitly granted to this auditor wallet.',
        icon: Eye,
        available: isAuditorRole === true,
      },
      {
        id: 'employee',
        label: 'Employee',
        eyebrow: 'Private vault',
        description: 'Decrypt your own values, request a withdrawal, and settle a verified ETH claim.',
        icon: UserRound,
        available: true,
      },
      {
        id: 'activity',
        label: 'Activity',
        eyebrow: 'Live chain feed',
        description: 'Watch payroll, treasury, roster, group, auditor, and settlement events.',
        icon: Activity,
        available: true,
      },
    ];

    return items.filter((item) => item.available);
  }, [canOperatePayroll, canOperateTreasury, canUseManagementPanel, contract, isAuditorRole, isConnected]);

  const defaultWorkspace: WorkspaceId = canOperatePayroll || canOperateTreasury
    ? 'payroll'
    : isAuditorRole === true
      ? 'auditor'
      : 'employee';
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspace)?.id ??
    workspaces.find((workspace) => workspace.id === defaultWorkspace)?.id ??
    workspaces[0]?.id;
  const activeWorkspaceMeta = workspaces.find((workspace) => workspace.id === activeWorkspace);

  return (
    <div className="dashboard-page">
      <motion.header className="dashboard-hero" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <p className="eyebrow">FhePay</p>
          <h1>Private payroll, settled on-chain.</h1>
          <p className="hero-copy">
            Encrypt salaries, run payroll, and settle verified ETH claims from one Sepolia dashboard.
          </p>
        </div>
        <div className="readiness-panel" aria-label="Runtime readiness">
          <div>
            <ShieldCheck size={18} />
            <span>Network</span>
            <strong>{onSepolia ? 'Sepolia' : 'Switch needed'}</strong>
          </div>
          <div>
            <Wallet size={18} />
            <span>Wallet</span>
            <strong>{isConnected ? 'Connected' : 'Disconnected'}</strong>
          </div>
          <div>
            <CheckCircle2 size={18} />
            <span>CoFHE</span>
            <strong>{cofheReady ? 'Ready' : 'Connecting'}</strong>
          </div>
          <div>
            <UserRoundCog size={18} />
            <span>Role</span>
            <strong>{roleLabel}</strong>
          </div>
        </div>
      </motion.header>

      {!contract && (
        <div className="notice notice-warn">
          Missing contract address. Set <code>VITE_FHEPAY_ADDRESS</code> in <code>frontend/.env.local</code> after deployment.
        </div>
      )}

      {contract && <ContractStatus />}
      <ConnectBar />

      {isConnected && contract && workspaces.length > 0 && activeWorkspace && (
        <section className="workspace-shell" aria-label="FhePay workspaces">
          <div className="workspace-tabs" role="tablist" aria-label="Dashboard workspace">
            {workspaces.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                id={`workspace-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={activeWorkspace === id}
                aria-controls={`workspace-panel-${id}`}
                className={activeWorkspace === id ? 'workspace-tab workspace-tab-active' : 'workspace-tab'}
                onClick={() => setSelectedWorkspace(id)}
              >
                <span className="workspace-tab-icon" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {activeWorkspaceMeta && (
            <div className="workspace-intro">
              <div>
                <p className="eyebrow">{activeWorkspaceMeta.eyebrow}</p>
                <h2>{activeWorkspaceMeta.label}</h2>
                <p>{activeWorkspaceMeta.description}</p>
              </div>
              <span className={`status-pill ${cofheReady ? 'status-ok' : 'status-warn'}`}>
                <CheckCircle2 size={14} />
                CoFHE {cofheReady ? 'ready' : 'connecting'}
              </span>
            </div>
          )}

          <div className="workspace-body">
            {workspaces.some((workspace) => workspace.id === 'payroll') && (
              <div
                id="workspace-panel-payroll"
                className="workspace-panel"
                role="tabpanel"
                aria-labelledby="workspace-tab-payroll"
                hidden={activeWorkspace !== 'payroll'}
              >
                <EmployerPanel />
              </div>
            )}

            {workspaces.some((workspace) => workspace.id === 'advanced') && (
              <div
                id="workspace-panel-advanced"
                className="workspace-panel"
                role="tabpanel"
                aria-labelledby="workspace-tab-advanced"
                hidden={activeWorkspace !== 'advanced'}
              >
                <Wave5Panel
                  isOwner={isOwner}
                  canOperatePayroll={canOperatePayroll}
                  canOperateTreasury={canOperateTreasury}
                />
              </div>
            )}

            {workspaces.some((workspace) => workspace.id === 'auditor') && (
              <div
                id="workspace-panel-auditor"
                className="workspace-panel"
                role="tabpanel"
                aria-labelledby="workspace-tab-auditor"
                hidden={activeWorkspace !== 'auditor'}
              >
                <AuditorPanel />
              </div>
            )}

            <div
              id="workspace-panel-employee"
              className="workspace-panel"
              role="tabpanel"
              aria-labelledby="workspace-tab-employee"
              hidden={activeWorkspace !== 'employee'}
            >
              <EmployeePanel />
              {!canUseManagementPanel && (
                <section className="card panel-card compact-boundary-card">
                  <p className="eyebrow">{isAuditorRole ? 'Auditor access' : 'Privacy boundary'}</p>
                  <h2>{isAuditorRole ? 'Selective disclosure wallet' : 'Employee-scoped access'}</h2>
                  <p className="prose-muted">
                    This wallet can decrypt only ciphertext handles granted by the contract.
                  </p>
                </section>
              )}
            </div>

            <div
              id="workspace-panel-activity"
              className="workspace-panel"
              role="tabpanel"
              aria-labelledby="workspace-tab-activity"
              hidden={activeWorkspace !== 'activity'}
            >
              <ActivityLog />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
