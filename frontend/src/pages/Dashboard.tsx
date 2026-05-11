import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, BookOpen, CheckCircle2, ShieldCheck, UserRoundCog, Wallet } from 'lucide-react';
import { useAccount, useChainId, useReadContract } from 'wagmi';
import { sepolia } from 'viem/chains';
import { ConnectBar } from '../components/ConnectBar';
import { ContractStatus } from '../components/ContractStatus';
import { EmployerPanel } from '../components/EmployerPanel';
import { EmployeePanel } from '../components/EmployeePanel';
import { ActivityLog } from '../components/ActivityLog';
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

  const isEmployer =
    !!owner &&
    !!address &&
    (owner as string).toLowerCase() === address.toLowerCase();
  const onSepolia = chainId === sepolia.id;

  return (
    <div className="dashboard-page">
      <motion.header className="dashboard-hero" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <p className="eyebrow">FhePay Wave 4</p>
          <h1>Confidential payroll console</h1>
          <p className="hero-copy">
            Operate encrypted salaries, treasury-backed payroll, private employee balances, and verified ETH claims on
            Ethereum Sepolia.
          </p>
          <div className="hero-actions">
            <Link to="/resources" className="btn btn-secondary">
              <BookOpen size={16} />
              Docs
            </Link>
            <Link to="/status" className="btn btn-secondary">
              <Activity size={16} />
              Status
            </Link>
          </div>
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
            <strong>{isConnected ? (isEmployer ? 'Employer' : 'Employee') : 'Pending'}</strong>
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

      {isConnected && contract && isEmployer && (
        <>
          <EmployerPanel />
          <EmployeePanel />
          <ActivityLog />
        </>
      )}

      {isConnected && contract && !isEmployer && (
        <>
          <EmployeePanel />
          <section className="card panel-card">
            <p className="eyebrow">Privacy boundary</p>
            <h2>Employee-scoped access</h2>
            <p className="prose-muted">
              This wallet can decrypt only ciphertext handles granted to it by the contract. Final ETH claim amounts are
              public settlement events.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
