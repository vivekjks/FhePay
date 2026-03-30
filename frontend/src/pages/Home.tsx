import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { HomeDecor } from '../components/home/HomeDecor';

const heroContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.06 },
  },
};

const heroItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7l8-4z" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  );
}

function IconCpu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function Home() {
  const reduce = useReducedMotion();
  const t = reduce ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };

  const inView = {
    initial: { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-40px' },
    transition: t,
  };

  return (
    <div style={{ position: 'relative' }}>
      <motion.header
        className="hero-block"
        style={{ textAlign: 'center', padding: '2.5rem 0 2.5rem', position: 'relative', minHeight: '420px' }}
        variants={heroContainer}
        initial="hidden"
        animate="show"
      >
        <HomeDecor />
        <div className="home-hero-inner">
          <motion.p className="badge" style={{ marginBottom: '1rem' }} variants={heroItem} transition={t}>
            Ethereum Sepolia · Fhenix CoFHE
          </motion.p>
          <motion.h1
            variants={heroItem}
            transition={t}
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 'clamp(2.1rem, 5vw, 3.35rem)',
              fontWeight: 700,
              margin: '0 0 1rem',
              letterSpacing: '-0.03em',
              lineHeight: 1.12,
            }}
          >
            Payroll that stays{' '}
            <span className="gradient-text">confidential</span>
            <br />
            on a public chain
          </motion.h1>
          <motion.p
            variants={heroItem}
            transition={t}
            style={{
              maxWidth: 620,
              margin: '0 auto 1rem',
              color: 'rgba(255,255,255,0.68)',
              fontSize: '1.08rem',
              lineHeight: 1.65,
            }}
          >
            FhePay is a confidential payroll layer: salaries and vault balances live as encrypted values on Ethereum.
            Employers configure pay in plaintext in the app — the chain only stores ciphertext handles. Employees unlock
            their own numbers locally; everyone else sees activity, not amounts.
          </motion.p>
          <motion.p
            variants={heroItem}
            transition={t}
            style={{
              maxWidth: 580,
              margin: '0 auto 1.75rem',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.95rem',
              lineHeight: 1.6,
            }}
          >
            Built for DAOs, remote teams, and builders who want on-chain payroll without public salary drama — powered by
            Fhenix CoFHE homomorphic operations inside the contract.
          </motion.p>
          <motion.div
            variants={heroItem}
            transition={t}
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}
          >
            <Link to="/app" className="btn">
              Launch app
            </Link>
            <Link to="/how-it-works" className="btn btn-ghost">
              How it works
            </Link>
            <Link to="/resources" className="btn btn-ghost">
              Docs & FAQ
            </Link>
            <Link to="/status" className="btn btn-ghost">
              Connection status
            </Link>
          </motion.div>
        </div>
      </motion.header>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...inView}>
        <h2 className="section-title">Why it matters</h2>
        <p className="prose-muted">
          Transparent blockchains are great for verification — but raw amounts on every transfer are a liability for HR:
          envy, negotiation leaks, and regulatory sensitivity. Traditional “private” payroll is off-chain; FhePay explores a
          middle path: <strong style={{ color: 'var(--fg)' }}>on-chain settlement with encrypted arithmetic</strong>.
          Observers can see <em>that</em> someone was paid, not <em>how much</em>, unless you deliberately disclose.
        </p>
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...inView}>
        <h2 className="section-title">What you get</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <IconShield />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>Client-side encryption</h3>
            <p className="prose-muted" style={{ margin: 0, fontSize: '0.95rem' }}>
              Salaries and withdrawals are encrypted in the browser before they reach Sepolia. The contract verifies ZK
              proofs and stores handles — not plaintext.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <IconCpu />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>Homomorphic payroll</h3>
            <p className="prose-muted" style={{ margin: 0, fontSize: '0.95rem' }}>
              Pay periods add encrypted salary into encrypted balances. Withdrawals compare amounts in ciphertext so
              balances stay private end-to-end.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <IconEye />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>Decrypt where it belongs</h3>
            <p className="prose-muted" style={{ margin: 0, fontSize: '0.95rem' }}>
              With ACL permits, employees decrypt their own row off-chain. Auditors and new features can build on
              selective disclosure — not an all-or-nothing leak.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <IconUsers />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>Two clear roles</h3>
            <p className="prose-muted" style={{ margin: 0, fontSize: '0.95rem' }}>
              The deployer acts as employer (set salary, pay, batch). Every other wallet uses the employee vault for its
              address — ideal for demos and user testing.
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...inView}>
        <h2 className="section-title">How Fhenix CoFHE fits</h2>
        <ul className="prose-muted" style={{ paddingLeft: '1.2rem', margin: 0 }}>
          <li style={{ marginBottom: '0.65rem' }}>
            <strong style={{ color: 'var(--fg)' }}>Encrypt</strong> — plaintext becomes a ciphertext + proof, bound to
            your wallet and chain id.
          </li>
          <li style={{ marginBottom: '0.65rem' }}>
            <strong style={{ color: 'var(--fg)' }}>Compute</strong> — the contract runs FHE.add / gte / select on handles;
            gas is real even though values are hidden.
          </li>
          <li>
            <strong style={{ color: 'var(--fg)' }}>Decrypt</strong> — the SDK unwraps handles you are allowed to see;
            permits align with <code style={{ color: 'var(--accent)' }}>FHE.allow</code> rules in the contract.
          </li>
        </ul>
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...inView}>
        <h2 className="section-title">How it works (four steps)</h2>
        <div className="steps">
          <div className="step">
            <span className="step-num">1</span>
            <div>
              <strong style={{ color: 'var(--fg)' }}>Connect on Sepolia</strong>
              <p className="prose-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.95rem' }}>
                Switch your wallet to Ethereum Sepolia and open the app. Wait until the CoFHE badge shows “ready”.
              </p>
            </div>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <div>
              <strong style={{ color: 'var(--fg)' }}>Employer sets encrypted salary</strong>
              <p className="prose-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.95rem' }}>
                Add an employee address and a salary in a plain unit (e.g. whole dollars). The UI encrypts before sending.
              </p>
            </div>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <div>
              <strong style={{ color: 'var(--fg)' }}>Run payroll</strong>
              <p className="prose-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.95rem' }}>
                Pay one period or batch several addresses. Each tx is a normal Sepolia transaction — fund gas with
                faucet ETH.
              </p>
            </div>
          </div>
          <div className="step">
            <span className="step-num">4</span>
            <div>
              <strong style={{ color: 'var(--fg)' }}>Employee decrypts & withdraws</strong>
              <p className="prose-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.95rem' }}>
                As the employee wallet, decrypt balance and optionally withdraw using an encrypted amount. See Resources
                for troubleshooting.
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...inView}>
        <h2 className="section-title">Roadmap & ideas</h2>
        <p className="prose-muted">
          Streaming payouts, multi-token vaults, org-scoped access, and auditor keys are natural extensions. This MVP
          nails the core loop: <strong style={{ color: 'var(--fg)' }}>encrypted configuration → homomorphic pay → local
          decrypt</strong> on a public testnet you can share with judges or teammates today.
        </p>
      </motion.section>

      <motion.div className="cta-panel" {...inView}>
        <h2 className="section-title" style={{ fontSize: '1.5rem' }}>
          Ready to try it?
        </h2>
        <p className="prose-muted" style={{ margin: '0 0 1.25rem', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          Connect your wallet, confirm you are on Sepolia, and explore employer and employee flows side by side with two
          accounts.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
          <Link to="/app" className="btn">
            Go to app
          </Link>
          <Link to="/resources" className="btn btn-ghost">
            Read the FAQ
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
