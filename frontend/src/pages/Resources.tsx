import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { sepolia } from 'viem/chains';
import { getFhePayAddress } from '../constants';

const inViewProps = (reduce: boolean | null) => ({
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-32px' },
  transition: reduce ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
});

export function Resources() {
  const addr = getFhePayAddress();
  const explorer = addr ? `https://sepolia.etherscan.io/address/${addr}` : null;
  const reduce = useReducedMotion();
  const iv = inViewProps(reduce);

  return (
    <div>
      <motion.header style={{ paddingBottom: '1.5rem' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="badge" style={{ marginBottom: '0.75rem' }}>
          Help and reference
        </p>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.1rem', margin: '0 0 0.5rem' }}>
          Resources
        </h1>
        <p className="prose-muted" style={{ maxWidth: 720, lineHeight: 1.65, margin: 0 }}>
          Everything you need to demo or evaluate the upgraded FhePay flow on {sepolia.name}: live deployment,
          documentation, checklists, and troubleshooting for confidential payroll, roster operations, and ETH settlement.
        </p>
      </motion.header>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...iv}>
        <h2 className="section-title">Live deployment</h2>
        {addr ? (
          <>
            <p className="prose-muted">
              This frontend points at the deployed payroll contract below. Etherscan will show treasury funding,
              payroll events, and ETH claim settlements, while encrypted salary and balance values stay private.
            </p>
            <code
              style={{
                display: 'block',
                marginTop: '0.75rem',
                padding: '0.85rem 1rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                border: '1px solid var(--border)',
                wordBreak: 'break-all',
                fontSize: '0.88rem',
              }}
            >
              {addr}
            </code>
            {explorer && (
              <a href={explorer} target="_blank" rel="noreferrer" className="btn" style={{ marginTop: '1rem', display: 'inline-flex' }}>
                Open on Sepolia Etherscan
              </a>
            )}
          </>
        ) : (
          <p className="prose-muted">
            Set <code>VITE_FHEPAY_ADDRESS</code> in <code>frontend/.env.local</code> after deployment.
          </p>
        )}
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...iv}>
        <h2 className="section-title">Quick start checklist</h2>
        <ol className="prose-muted" style={{ paddingLeft: '1.25rem', lineHeight: 1.85, margin: 0 }}>
          <li>Use two Sepolia wallets: one employer wallet and one employee wallet.</li>
          <li>Fund the employer with enough Sepolia ETH for gas and treasury deposits.</li>
          <li>Open <Link to="/app">App</Link>, connect, and wait for CoFHE to become ready.</li>
          <li>Fund the treasury, set salary, confirm the roster entry is active, and run payroll.</li>
          <li>Switch to the employee wallet, decrypt the balance, and claim ETH to the wallet.</li>
        </ol>
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...iv}>
        <h2 className="section-title">Key documentation</h2>
        <ul style={{ lineHeight: 2, color: 'rgba(255,255,255,0.78)', paddingLeft: '1.2rem', margin: 0 }}>
          <li>
            <a href="https://cofhe-docs.fhenix.zone/" target="_blank" rel="noreferrer">
              Fhenix CoFHE documentation
            </a>
          </li>
          <li>
            <a href="https://cofhe-docs.fhenix.zone/client-sdk/guides/permits" target="_blank" rel="noreferrer">
              Permits guide
            </a>
          </li>
          <li>
            <a href="https://cofhe-docs.fhenix.zone/client-sdk/guides/decrypt-to-tx" target="_blank" rel="noreferrer">
              decryptForTx guide
            </a>
          </li>
          <li>
            <a href="https://cofhe-docs.fhenix.zone/client-sdk/guides/writing-decrypt-result" target="_blank" rel="noreferrer">
              Writing decrypt results on-chain
            </a>
          </li>
          <li>
            <a href="https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/access-control" target="_blank" rel="noreferrer">
              FHE access control
            </a>
          </li>
        </ul>
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...iv}>
        <h2 className="section-title">Glossary</h2>
        <dl style={{ margin: 0 }}>
          <dt style={{ fontWeight: 600, marginTop: '0.85rem', color: 'var(--accent)' }}>euint128</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            Encrypted 128-bit integer used for salaries, balances, and pending withdrawals in wei-denominated ETH.
          </dd>
          <dt style={{ fontWeight: 600, marginTop: '0.85rem', color: 'var(--accent)' }}>Permit</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            An off-chain authorization used when decrypting employee-specific data with <code>decryptForView</code>.
          </dd>
          <dt style={{ fontWeight: 600, marginTop: '0.85rem', color: 'var(--accent)' }}>decryptForTx</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            A client-side decryption flow that returns both the plaintext and a proof signature for an on-chain action.
          </dd>
          <dt style={{ fontWeight: 600, marginTop: '0.85rem', color: 'var(--accent)' }}>Roster status</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            Public employee registration and active/inactive state used to control who can be paid in future payroll
            runs.
          </dd>
        </dl>
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...iv}>
        <h2 className="section-title">FAQ</h2>
        <dl style={{ margin: 0 }}>
          <dt style={{ fontWeight: 600, marginTop: '1rem', color: 'var(--accent)' }}>Why is treasury funding public?</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            Treasury ETH and final wallet claims are public blockchain actions. The private part is the salary and
            intermediate payroll balance arithmetic.
          </dd>
          <dt style={{ fontWeight: 600, marginTop: '1rem', color: 'var(--accent)' }}>Why is withdrawal a two-step flow?</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            The contract first updates the encrypted balance, then the client obtains a verifiable decrypt proof and
            claims ETH. That mirrors the documented Fhenix settlement model.
          </dd>
          <dt style={{ fontWeight: 600, marginTop: '1rem', color: 'var(--accent)' }}>What happens if I over-request?</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            The contract keeps the confidential balance unchanged and the claim resolves to zero, which the app clears
            cleanly.
          </dd>
          <dt style={{ fontWeight: 600, marginTop: '1rem', color: 'var(--accent)' }}>What does batch payroll do now?</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            It calls <code>batchPaySalary</code> once on-chain for the full employee list, reducing wallet-confirmation
            friction. The contract caps each batch to keep the transaction size predictable.
          </dd>
          <dt style={{ fontWeight: 600, marginTop: '1rem', color: 'var(--accent)' }}>Can I clear a stuck claim?</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            Yes. <code>cancelWithdrawal</code> returns the encrypted pending amount to the employee's confidential
            balance and clears the pending flag.
          </dd>
        </dl>
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...iv}>
        <h2 className="section-title">Troubleshooting</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem', color: 'rgba(255,255,255,0.78)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem 0.5rem 0.65rem 0' }}>Symptom</th>
              <th style={{ padding: '0.5rem 0 0.65rem 0.5rem' }}>Try this</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '0.65rem 0.5rem 0.65rem 0', verticalAlign: 'top' }}>CoFHE never becomes ready</td>
              <td style={{ padding: '0.65rem 0 0.65rem 0.5rem' }}>Reconnect the wallet, refresh the page, and disable aggressive ad blockers if needed.</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '0.65rem 0.5rem 0.65rem 0', verticalAlign: 'top' }}>Payroll tx reverts</td>
              <td style={{ padding: '0.65rem 0 0.65rem 0.5rem' }}>Check that the owner wallet is connected and that the employee is outside the current pay interval lock.</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '0.65rem 0.5rem 0.65rem 0', verticalAlign: 'top' }}>Claim fails with treasury error</td>
              <td style={{ padding: '0.65rem 0 0.65rem 0.5rem' }}>Fund the employer treasury and use the employee's pending-claim button again.</td>
            </tr>
            <tr>
              <td style={{ padding: '0.65rem 0.5rem 0.65rem 0', verticalAlign: 'top' }}>Decrypt fails for the employee</td>
              <td style={{ padding: '0.65rem 0 0.65rem 0.5rem' }}>Make sure payroll was actually run for that wallet and that you are decrypting from the correct address on Sepolia.</td>
            </tr>
          </tbody>
        </table>
      </motion.section>

      <motion.div className="cta-panel" {...iv} style={{ marginTop: '0.5rem' }}>
        <p style={{ margin: 0, fontSize: '1rem' }}>
          <Link to="/app" className="btn">
            Open dashboard
          </Link>
          <span style={{ display: 'inline-block', width: '0.75rem' }} />
          <Link to="/" className="btn btn-ghost">
            Back home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
