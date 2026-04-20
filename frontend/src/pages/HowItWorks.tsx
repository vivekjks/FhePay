import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const iv = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.4 },
};

export function HowItWorks() {
  return (
    <div>
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="badge" style={{ marginBottom: '0.65rem' }}>
          Deep dive
        </p>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.85rem, 4vw, 2.2rem)', margin: '0 0 0.5rem' }}>
          How the payroll flow works
        </h1>
        <p className="prose-muted" style={{ maxWidth: 720, margin: 0 }}>
          A concise map from salary setup to a claimed ETH payout, using encrypted balances, threshold-network
          decryption, and a treasury-backed settlement path.
        </p>
      </motion.header>

      <motion.section className="card" style={{ marginTop: '1.5rem' }} {...iv}>
        <h2 className="section-title">System model</h2>
        <p className="prose-muted">
          FhePay stores salary, accrued balance, and pending withdrawal requests as <code>euint128</code> ciphertext
          handles. The contract can add and compare them without seeing plaintext values. The browser encrypts inputs and
          later decrypts outputs only where the contract's access-control rules permit it.
        </p>
        <pre
          style={{
            marginTop: '1rem',
            padding: '1rem 1.25rem',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'rgba(0,0,0,0.35)',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '0.8rem',
            lineHeight: 1.55,
            overflow: 'auto',
          }}
        >
{`Browser encrypts salary/request
        |
        v
FhePay stores encrypted salary + balances
        |
        +--> paySalary / batchPaySalary uses FHE.add
        |
        +--> requestWithdraw uses FHE.gte + FHE.select
        |
        v
Pending claim becomes decryptable for settlement
        |
        v
Client runs decryptForTx and submits proof
        |
        v
claimWithdrawal verifies proof and transfers ETH`}
        </pre>
      </motion.section>

      <motion.section className="card" style={{ marginTop: '1rem' }} {...iv}>
        <h2 className="section-title">Employer lifecycle</h2>
        <ol className="prose-muted" style={{ paddingLeft: '1.2rem', lineHeight: 1.85, margin: 0 }}>
          <li>Fund the treasury with ETH so employee claims can settle on-chain.</li>
          <li>Encrypt each employee salary in the browser and store it with <code>setSalary</code>.</li>
          <li>Choose a pay interval to guard against accidental double-pay.</li>
          <li>Run payroll for one employee or execute <code>batchPaySalary</code> for the team in one transaction.</li>
        </ol>
      </motion.section>

      <motion.section className="card" style={{ marginTop: '1rem' }} {...iv}>
        <h2 className="section-title">Employee lifecycle</h2>
        <ol className="prose-muted" style={{ paddingLeft: '1.2rem', lineHeight: 1.85, margin: 0 }}>
          <li>Read the ciphertext handles for your salary and balance from the contract.</li>
          <li>
            Decrypt them locally with <code>decryptForView(...).withPermit()</code> using your self permit.
          </li>
          <li>
            Request a withdrawal with an encrypted amount. The contract subtracts it confidentially if your balance is
            sufficient.
          </li>
          <li>
            The pending withdrawal is marked decryptable for settlement, so the client can run <code>decryptForTx</code>{' '}
            and submit the proof to <code>claimWithdrawal</code>.
          </li>
        </ol>
      </motion.section>

      <motion.section className="card" style={{ marginTop: '1rem' }} {...iv}>
        <h2 className="section-title">Why this matches the Fhenix model</h2>
        <ul className="prose-muted" style={{ paddingLeft: '1.2rem', margin: 0, lineHeight: 1.8 }}>
          <li>
            <strong style={{ color: 'var(--fg)' }}>ACL-compliant viewing:</strong> employee balance and salary decrypts
            use address-scoped access plus permits.
          </li>
          <li>
            <strong style={{ color: 'var(--fg)' }}>Verified settlement:</strong> claimable withdrawals use the documented
            decrypt-for-transaction flow and on-chain signature verification.
          </li>
          <li>
            <strong style={{ color: 'var(--fg)' }}>Operational safety:</strong> the pay interval blocks accidental rapid
            repeats, and batch payroll reduces wallet-confirmation fatigue.
          </li>
        </ul>
      </motion.section>

      <motion.section className="card" style={{ marginTop: '1rem' }} {...iv}>
        <h2 className="section-title">What remains public</h2>
        <p className="prose-muted">
          Treasury deposits, wallet addresses, and final ETH claims are public. Confidential salary and intermediate
          payroll balances are not. This is a pragmatic privacy boundary that keeps payroll arithmetic private while
          preserving verifiable settlement.
        </p>
      </motion.section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '2rem' }}>
        <Link to="/app" className="btn">
          Open dashboard
        </Link>
        <Link to="/resources" className="btn btn-ghost">
          Read the resources
        </Link>
      </div>
    </div>
  );
}
