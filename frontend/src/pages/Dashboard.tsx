import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAccount, useReadContract } from 'wagmi';
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

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="badge" style={{ marginBottom: '0.65rem' }}>
          Payroll app
        </p>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.75rem, 4vw, 2.2rem)', margin: '0 0 0.5rem' }}>
          Confidential payroll on Sepolia
        </h1>
        <p className="prose-muted" style={{ marginBottom: '1rem', maxWidth: 720 }}>
          This console now runs the full flow: employer-funded treasury, encrypted salaries, pay-cycle enforcement,
          single-transaction batch payroll, confidential withdrawal requests, and verified ETH claims to the employee
          wallet.
        </p>
      </motion.div>

      {contract && (
        <motion.section
          className="card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35 }}
          style={{ marginBottom: '1rem', borderColor: 'rgba(255,182,193,0.18)' }}
        >
          <h2 className="section-title" style={{ fontSize: '1.05rem' }}>
            Recommended flow
          </h2>
          <ol className="prose-muted" style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.75, fontSize: '0.95rem' }}>
            <li>Connect on Sepolia and wait for the CoFHE badge to show ready.</li>
            <li>Employer: fund the treasury, set salary, and choose a pay interval.</li>
            <li>Run payroll for one employee or use the single-transaction batch payroll action.</li>
            <li>Employee: decrypt balance, request a withdrawal, and claim ETH to the wallet.</li>
          </ol>
          <p className="prose-muted" style={{ margin: '0.85rem 0 0' }}>
            Need troubleshooting? Open <Link to="/status">Status</Link> or <Link to="/resources">Resources</Link>.
          </p>
        </motion.section>
      )}

      {contract && !isConnected && (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '1rem', borderColor: 'rgba(255,182,193,0.28)' }}
        >
          <strong style={{ color: 'var(--fg)' }}>Connect your wallet</strong>
          <p className="prose-muted" style={{ margin: '0.5rem 0 0.75rem' }}>
            The dashboard needs an active Sepolia wallet. Once connected, give CoFHE a moment to establish the client
            session before running encrypted actions.
          </p>
        </motion.div>
      )}

      {!contract && (
        <div className="card" style={{ borderColor: 'rgba(255,182,193,0.35)' }}>
          <strong>Missing contract address.</strong> Set <code>VITE_FHEPAY_ADDRESS</code> in{' '}
          <code>frontend/.env.local</code> after deployment.
        </div>
      )}

      {contract && <ContractStatus />}
      <ConnectBar />

      {isConnected && contract && (
        <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="badge">{isEmployer ? 'Role: employer' : 'Role: employee'}</span>
          <span className="badge" style={{ color: cofheReady ? 'var(--accent)' : 'rgba(255,255,255,0.55)' }}>
            CoFHE: {cofheReady ? 'ready' : 'connecting'}
          </span>
        </div>
      )}

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
          <motion.section
            className="card"
            style={{ marginTop: '1rem' }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title">Selective disclosure roadmap</h2>
            <p className="prose-muted" style={{ margin: 0 }}>
              The app currently keeps salary and balance access scoped to each employee. A next step is permit-sharing
              for auditors, HR operators, or compliance reviewers who need policy-based visibility without exposing data
              to everyone.
            </p>
          </motion.section>
        </>
      )}
    </div>
  );
}
