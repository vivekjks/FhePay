import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getFhePayAddress } from '../constants';
import { sepolia } from 'viem/chains';

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
          Help & reference
        </p>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.85rem, 4vw, 2.25rem)', margin: '0 0 0.5rem' }}>
          Resources
        </h1>
        <p className="prose-muted" style={{ maxWidth: 680, lineHeight: 1.65, margin: 0 }}>
          Everything you need to run FhePay on <strong style={{ color: 'var(--fg)' }}>{sepolia.name}</strong>: live
          contract, official docs, a quick checklist, glossary, and answers to common questions.
        </p>
      </motion.header>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...iv}>
        <h2 className="section-title">Live deployment</h2>
        {addr ? (
          <>
            <p className="prose-muted">
              This frontend build points at the FhePay contract below. Inspect bytecode, transactions, and events on
              Etherscan — you will see <strong style={{ color: 'var(--fg)' }}>addresses</strong> in logs, never plaintext
              salaries.
            </p>
            <code
              style={{
                display: 'block',
                marginTop: '0.75rem',
                padding: '0.85rem 1rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
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
            Set <code>VITE_FHEPAY_ADDRESS</code> in <code>frontend/.env.local</code> after deploying the contract (the
            deploy script can write this file for you).
          </p>
        )}
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...iv}>
        <h2 className="section-title">Quick start checklist</h2>
        <ol className="prose-muted" style={{ paddingLeft: '1.25rem', lineHeight: 1.85, margin: 0 }}>
          <li>Install a browser wallet and add the <strong style={{ color: 'var(--fg)' }}>Ethereum Sepolia</strong> network.</li>
          <li>Get test ETH from a Sepolia faucet so you can sign transactions.</li>
          <li>Open <Link to="/app">App</Link>, connect, and confirm the network badge shows Sepolia.</li>
          <li>Wait until <strong style={{ color: 'var(--fg)' }}>CoFHE: ready</strong> appears (encryption needs a live session).</li>
          <li>
            As <strong style={{ color: 'var(--fg)' }}>employer</strong> (deployer wallet): set salary for a second wallet
            address, then pay. As <strong style={{ color: 'var(--fg)' }}>employee</strong>: connect that second wallet and
            decrypt.
          </li>
        </ol>
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...iv}>
        <h2 className="section-title">Documentation</h2>
        <ul style={{ lineHeight: 2, color: 'rgba(255,255,255,0.78)', paddingLeft: '1.2rem', margin: 0 }}>
          <li>
            <a href="https://cofhe-docs.fhenix.zone/" target="_blank" rel="noreferrer">
              Fhenix CoFHE documentation (overview)
            </a>
          </li>
          <li>
            <a href="https://cofhe-docs.fhenix.zone/client-sdk/quick-start/hardhat" target="_blank" rel="noreferrer">
              Hardhat + CoFHE quick start
            </a>
          </li>
          <li>
            <a href="https://cofhe-docs.fhenix.zone/client-sdk/guides/client-setup" target="_blank" rel="noreferrer">
              Client setup (viem / wagmi)
            </a>
          </li>
          <li>
            <a href="https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/access-control" target="_blank" rel="noreferrer">
              FHE access control (allow / allowThis)
            </a>
          </li>
        </ul>
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...iv}>
        <h2 className="section-title">Glossary</h2>
        <dl style={{ margin: 0 }}>
          <dt style={{ fontWeight: 600, marginTop: '0.85rem', color: 'var(--accent)' }}>Ciphertext handle</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            An on-chain reference to an encrypted value. Observers see a handle, not the number inside.
          </dd>
          <dt style={{ fontWeight: 600, marginTop: '0.85rem', color: 'var(--accent)' }}>euint32</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            Encrypted 32-bit integer type in the contract. Pick one real-world unit (e.g. whole USD) and stay within range.
          </dd>
          <dt style={{ fontWeight: 600, marginTop: '0.85rem', color: 'var(--accent)' }}>Permit</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            Off-chain authorization that lets the CoFHE client decrypt handles you are allowed to see.
          </dd>
        </dl>
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...iv}>
        <h2 className="section-title">FAQ</h2>
        <dl style={{ margin: 0 }}>
          <dt style={{ fontWeight: 600, marginTop: '1rem', color: 'var(--accent)' }}>Why do I need Sepolia ETH?</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            Encrypted transactions are still transactions: gas is paid in ETH on the testnet. Use a faucet; amounts are
            free test tokens.
          </dd>
          <dt style={{ fontWeight: 600, marginTop: '1rem', color: 'var(--accent)' }}>Which wallet is the employer?</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            The address that deployed the contract is the <code>owner</code> and sees employer tools. Use a different
            address to experience the employee flow.
          </dd>
          <dt style={{ fontWeight: 600, marginTop: '1rem', color: 'var(--accent)' }}>Decrypt shows an error</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            Stay on Sepolia, wait for CoFHE ready, and ensure you have interacted as that employee (salary set, pay, or
            withdraw) so ACL allows your wallet on the handle.
          </dd>
          <dt style={{ fontWeight: 600, marginTop: '1rem', color: 'var(--accent)' }}>What does “batch pay” do?</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            It sends one <code>paySalary</code> per address in order. Confirm each transaction in your wallet; useful for
            demos with a short list of employees.
          </dd>
          <dt style={{ fontWeight: 600, marginTop: '1rem', color: 'var(--accent)' }}>Is my salary visible on Etherscan?</dt>
          <dd className="prose-muted" style={{ margin: '0.35rem 0 0' }}>
            Not as plaintext. You may see contract calls and events with addresses; amounts remain encrypted on-chain.
          </dd>
        </dl>
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...iv}>
        <h2 className="section-title">Troubleshooting</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem', color: 'rgba(255,255,255,0.75)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem 0.5rem 0.65rem 0' }}>Symptom</th>
              <th style={{ padding: '0.5rem 0 0.65rem 0.5rem' }}>Try this</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '0.65rem 0.5rem 0.65rem 0', verticalAlign: 'top' }}>Wrong network</td>
              <td style={{ padding: '0.65rem 0 0.65rem 0.5rem' }}>Switch to Ethereum Sepolia in your wallet; use the in-app button if shown.</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '0.65rem 0.5rem 0.65rem 0', verticalAlign: 'top' }}>CoFHE stuck on “connecting”</td>
              <td style={{ padding: '0.65rem 0 0.65rem 0.5rem' }}>Reconnect the wallet, refresh the page, or disable aggressive ad blockers for the iframe storage used by the SDK.</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '0.65rem 0.5rem 0.65rem 0', verticalAlign: 'top' }}>Transaction reverts</td>
              <td style={{ padding: '0.65rem 0 0.65rem 0.5rem' }}>Check Sepolia ETH balance, contract address in env, and that employer actions use the owner wallet.</td>
            </tr>
            <tr>
              <td style={{ padding: '0.65rem 0.5rem 0.65rem 0', verticalAlign: 'top' }}>Balance decrypt is zero</td>
              <td style={{ padding: '0.65rem 0 0.65rem 0.5rem' }}>Run pay salary after setting salary; decrypt again after state changes.</td>
            </tr>
          </tbody>
        </table>
      </motion.section>

      <motion.div className="cta-panel" {...iv} style={{ marginTop: '0.5rem' }}>
        <p style={{ margin: 0, fontSize: '1rem' }}>
          <Link to="/app" className="btn">
            Back to app
          </Link>
          <span style={{ display: 'inline-block', width: '0.75rem' }} />
          <Link to="/" className="btn btn-ghost">
            Home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
