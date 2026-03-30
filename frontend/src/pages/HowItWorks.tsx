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
          How FhePay works
        </h1>
        <p className="prose-muted" style={{ maxWidth: 680, margin: 0 }}>
          A concise map of data flow from your keyboard to Sepolia and back — without leaking salary amounts.
        </p>
      </motion.header>

      <motion.section className="card" style={{ marginTop: '1.5rem' }} {...iv}>
        <h2 className="section-title">The big picture</h2>
        <p className="prose-muted">
          Traditional payroll on-chain exposes amounts. FhePay uses <strong style={{ color: 'var(--fg)' }}>Fhenix CoFHE</strong>{' '}
          so the contract stores and manipulates <em>encrypted</em> integers. Your browser encrypts before sending; your
          browser decrypts only what the contract allows you to see.
        </p>
        <pre
          style={{
            marginTop: '1rem',
            padding: '1rem 1.25rem',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'rgba(0,0,0,0.35)',
            color: 'rgba(255,255,255,0.75)',
            fontSize: '0.78rem',
            lineHeight: 1.5,
            overflow: 'auto',
          }}
        >
{`┌─────────────┐    encrypt     ┌──────────────┐    FHE ops     ┌─────────────┐
│   Browser   │ ────────────▶ │   Sepolia    │ ────────────▶ │  Ciphertext │
│  (CoFHE)    │ ◀──────────── │  FhePay.sol  │               │   handles   │
└─────────────┘    decrypt    └──────────────┘               └─────────────┘
     ↑                              │
     │         Events (addresses)   │
     └──────────────────────────────┘`}
        </pre>
      </motion.section>

      <motion.section className="card" style={{ marginTop: '1rem' }} {...iv}>
        <h2 className="section-title">Employer path</h2>
        <ol className="prose-muted" style={{ paddingLeft: '1.2rem', lineHeight: 1.85, margin: 0 }}>
          <li>You enter a salary as a normal number (e.g. 5000 in your chosen unit).</li>
          <li>
            The SDK <strong style={{ color: 'var(--fg)' }}>encrypts</strong> it into an <code>InEuint32</code> struct
            with a proof.
          </li>
          <li>
            <code>setSalary</code> stores the encrypted salary and updates ACL so the employee can decrypt that row.
          </li>
          <li>
            <code>paySalary</code> homomorphically adds encrypted salary to the employee encrypted balance — no
            plaintext in the middle.
          </li>
        </ol>
      </motion.section>

      <motion.section className="card" style={{ marginTop: '1rem' }} {...iv}>
        <h2 className="section-title">Employee path</h2>
        <ol className="prose-muted" style={{ paddingLeft: '1.2rem', lineHeight: 1.85, margin: 0 }}>
          <li>You connect your wallet and read ciphertext handles from the contract (public view calls).</li>
          <li>
            The SDK <strong style={{ color: 'var(--fg)' }}>decrypts</strong> only where permits allow — your balance
            and salary for your address.
          </li>
          <li>
            <code>withdraw</code> takes an encrypted amount; the contract compares and updates balance in ciphertext
            (insufficient funds keep the previous balance without leaking why).
          </li>
        </ol>
      </motion.section>

      <motion.section className="card" style={{ marginTop: '1rem' }} {...iv}>
        <h2 className="section-title">What you can verify</h2>
        <ul className="prose-muted" style={{ paddingLeft: '1.2rem', margin: 0, lineHeight: 1.8 }}>
          <li>
            <strong style={{ color: 'var(--fg)' }}>Etherscan</strong> — transaction list and events with addresses; not
            dollar amounts.
          </li>
          <li>
            <Link to="/status" style={{ fontWeight: 600 }}>
              Status page
            </Link>{' '}
            — live network, block, and CoFHE readiness.
          </li>
          <li>
            <strong style={{ color: 'var(--fg)' }}>Local decrypt</strong> — matches what you typed, only on your machine
            after the CoFHE client runs.
          </li>
        </ul>
      </motion.section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '2rem' }}>
        <Link to="/app" className="btn">
          Back to app
        </Link>
        <Link to="/resources" className="btn btn-ghost">
          FAQ
        </Link>
      </div>
    </div>
  );
}
