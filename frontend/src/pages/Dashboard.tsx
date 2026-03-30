import { useAccount, useReadContract } from 'wagmi';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ConnectBar } from '../components/ConnectBar';
import { ContractStatus } from '../components/ContractStatus';
import { EmployerPanel } from '../components/EmployerPanel';
import { EmployeePanel } from '../components/EmployeePanel';
import { ActivityLog } from '../components/ActivityLog';
import { getFhePayAddress } from '../constants';
import { fhePayAbi } from '../abi/fhepay';
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
          Dashboard
        </p>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.75rem, 4vw, 2.15rem)', margin: '0 0 0.5rem' }}>
          FhePay console
        </h1>
        <p className="prose-muted" style={{ marginBottom: '1rem', maxWidth: 640 }}>
          Connect your wallet on <strong style={{ color: 'var(--fg)' }}>Sepolia</strong>. The deployer wallet unlocks
          employer actions (set salary, pay, batch). Any other address can open the employee vault for{' '}
          <em>its own</em> row after you have assigned a salary as employer.
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
            First time here?
          </h2>
          <ol className="prose-muted" style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.75, fontSize: '0.95rem' }}>
            <li>Confirm network is Sepolia and wait for CoFHE: ready.</li>
            <li>Employer: add employee address + salary → Pay once (or batch).</li>
            <li>Employee: switch wallet → Decrypt balance → optional Withdraw.</li>
            <li>
              Need help? See{' '}
              <Link to="/resources" style={{ fontWeight: 600 }}>
                Resources
              </Link>
              .
            </li>
          </ol>
        </motion.section>
      )}

      {!contract && (
        <div className="card" style={{ borderColor: 'rgba(255,182,193,0.35)' }}>
          <strong>Missing contract address.</strong> Set <code>VITE_FHEPAY_ADDRESS</code> in{' '}
          <code>frontend/.env.local</code> after running <code>npm run deploy:sepolia</code> from the contracts package.
        </div>
      )}

      {contract && <ContractStatus />}

      <ConnectBar />

      {isConnected && contract && (
        <p style={{ marginTop: '1rem', fontSize: '0.95rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <span className="badge">{isEmployer ? 'Role: employer' : 'Role: employee / other'}</span>
          <span className="badge" style={{ color: cofheReady ? 'var(--accent)' : 'rgba(255,255,255,0.45)' }}>
            CoFHE: {cofheReady ? 'ready' : 'connecting…'}
          </span>
        </p>
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
            <h2 className="section-title">Auditor disclosure</h2>
            <p className="prose-muted" style={{ margin: 0 }}>
              Future versions can delegate <code>FHE.allow</code> to an auditor address for policy-based plaintext review.
              Today, decryption is scoped so employees read their own balances; plan extra disclosures explicitly for
              compliance scenarios.
            </p>
          </motion.section>
        </>
      )}
    </div>
  );
}
