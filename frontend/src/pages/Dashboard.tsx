import { motion } from 'framer-motion';
import { CheckCircle2, ShieldCheck, UserRoundCog, Wallet } from 'lucide-react';
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

export function Dashboard() {
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

      {isConnected && contract && canUseManagementPanel && (
        <>
          {(canOperatePayroll || canOperateTreasury) && <EmployerPanel />}
          <Wave5Panel
            isOwner={isOwner}
            canOperatePayroll={canOperatePayroll}
            canOperateTreasury={canOperateTreasury}
          />
          {isAuditorRole === true && <AuditorPanel />}
          <EmployeePanel />
          <ActivityLog />
        </>
      )}

      {isConnected && contract && !canUseManagementPanel && (
        <>
          {isAuditorRole === true && <AuditorPanel />}
          <EmployeePanel />
          <section className="card panel-card">
            <p className="eyebrow">{isAuditorRole ? 'Auditor access' : 'Privacy boundary'}</p>
            <h2>{isAuditorRole ? 'Selective disclosure wallet' : 'Employee-scoped access'}</h2>
            <p className="prose-muted">
              This wallet can decrypt only ciphertext handles granted by the contract.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
