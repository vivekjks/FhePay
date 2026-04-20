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

function IconVault() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7z" />
      <path d="M9 12h6" />
      <circle cx="15.5" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}

function IconFlow() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7h11" />
      <path d="M11 4l4 3-4 3" />
      <path d="M20 17H9" />
      <path d="M13 14l-4 3 4 3" />
    </svg>
  );
}

function IconTeam() {
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
        style={{ textAlign: 'center', padding: '2.5rem 0 2.5rem', position: 'relative', minHeight: '440px' }}
        variants={heroContainer}
        initial="hidden"
        animate="show"
      >
        <HomeDecor />
        <div className="home-hero-inner">
          <motion.p className="badge" style={{ marginBottom: '1rem' }} variants={heroItem} transition={t}>
            Ethereum Sepolia x Fhenix CoFHE
          </motion.p>
          <motion.h1
            variants={heroItem}
            transition={t}
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 700,
              margin: '0 0 1rem',
              letterSpacing: '-0.03em',
              lineHeight: 1.08,
            }}
          >
            Private payroll,
            <br />
            <span className="gradient-text">verified on-chain</span>
          </motion.h1>
          <motion.p
            variants={heroItem}
            transition={t}
            style={{
              maxWidth: 700,
              margin: '0 auto 1rem',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '1.08rem',
              lineHeight: 1.7,
            }}
          >
            FhePay keeps salaries and balances encrypted on Ethereum while still letting teams run payroll from a funded
            on-chain treasury. Employers schedule and batch payroll privately. Employees decrypt their own balance, then
            claim ETH into their wallet with a verifiable threshold-network proof.
          </motion.p>
          <motion.div
            variants={heroItem}
            transition={t}
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}
          >
            <Link to="/app" className="btn">
              Launch app
            </Link>
            <Link to="/how-it-works" className="btn btn-ghost">
              Explore the flow
            </Link>
            <Link to="/status" className="btn btn-ghost">
              Check status
            </Link>
          </motion.div>
        </div>
      </motion.header>

      <motion.section className="stats-grid" style={{ marginBottom: '1.25rem' }} {...inView}>
        <div className="stat-card">
          <span className="label">Privacy model</span>
          <strong>Encrypted salary + balance handles</strong>
        </div>
        <div className="stat-card">
          <span className="label">Settlement</span>
          <strong>Claimable ETH from employer treasury</strong>
        </div>
        <div className="stat-card">
          <span className="label">Ops upgrade</span>
          <strong>Single-tx batch payroll + pay interval guard</strong>
        </div>
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...inView}>
        <h2 className="section-title">What changed in this version</h2>
        <p className="prose-muted">
          The app is no longer just a confidential ledger demo. It now supports a real treasury-backed payroll flow:
          the employer funds the contract with ETH, payroll accrues in encrypted balances, and employees can request and
          claim real ETH withdrawals on-chain. We also upgraded amounts to <code>euint128</code> and replaced multi-click
          batch UX with a single batch transaction.
        </p>
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...inView}>
        <h2 className="section-title">Why FhePay is useful</h2>
        <p className="prose-muted">
          Public chains make settlement easy but salaries painfully transparent. FhePay uses CoFHE to preserve
          confidentiality without giving up verifiable execution. Observers can see that payroll happened, who
          interacted, and when treasury funds moved, but not the salary numbers that drove those actions.
        </p>
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...inView}>
        <h2 className="section-title">Core capabilities</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <IconShield />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>Client-side encryption</h3>
            <p className="prose-muted" style={{ margin: 0, fontSize: '0.95rem' }}>
              Salaries and withdrawal requests are encrypted in the browser before they ever reach Sepolia.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <IconVault />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>Treasury-backed settlement</h3>
            <p className="prose-muted" style={{ margin: 0, fontSize: '0.95rem' }}>
              Employers fund a payroll treasury with ETH, and employees claim verified withdrawals into their wallet.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <IconFlow />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>Request then claim</h3>
            <p className="prose-muted" style={{ margin: 0, fontSize: '0.95rem' }}>
              The withdrawal flow follows the documented decrypt-for-transaction pattern with on-chain proof
              verification.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <IconTeam />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>Production-oriented payroll ops</h3>
            <p className="prose-muted" style={{ margin: 0, fontSize: '0.95rem' }}>
              Pay intervals prevent accidental double-pay, and batch payroll runs in one transaction instead of many.
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section className="card" style={{ marginBottom: '1.25rem' }} {...inView}>
        <h2 className="section-title">Four-step experience</h2>
        <div className="steps">
          <div className="step">
            <span className="step-num">1</span>
            <div>
              <strong style={{ color: 'var(--fg)' }}>Connect on Sepolia</strong>
              <p className="prose-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.95rem' }}>
                Open the dashboard, connect the owner wallet, and wait until CoFHE is ready.
              </p>
            </div>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <div>
              <strong style={{ color: 'var(--fg)' }}>Fund + configure payroll</strong>
              <p className="prose-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.95rem' }}>
                Deposit treasury ETH, set confidential salaries, and choose the payroll cadence.
              </p>
            </div>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <div>
              <strong style={{ color: 'var(--fg)' }}>Run payroll</strong>
              <p className="prose-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.95rem' }}>
                Pay one employee or execute a single-transaction batch payroll run for the whole team.
              </p>
            </div>
          </div>
          <div className="step">
            <span className="step-num">4</span>
            <div>
              <strong style={{ color: 'var(--fg)' }}>Claim ETH privately</strong>
              <p className="prose-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.95rem' }}>
                Employees decrypt their balance locally and claim ETH using a verified decryption proof.
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.div className="cta-panel" {...inView}>
        <h2 className="section-title" style={{ fontSize: '1.5rem' }}>
          Ready to test the full flow?
        </h2>
        <p className="prose-muted" style={{ margin: '0 0 1.25rem', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
          Use one wallet as the employer and a second wallet as the employee to experience the entire payroll request and
          claim journey end-to-end.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
          <Link to="/app" className="btn">
            Open dashboard
          </Link>
          <Link to="/resources" className="btn btn-ghost">
            Read the docs
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
