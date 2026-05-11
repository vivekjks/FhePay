import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Banknote, LockKeyhole, ShieldCheck, Users } from 'lucide-react';

const cards = [
  {
    icon: LockKeyhole,
    title: 'Encrypted payroll amounts',
    copy: 'Salaries, balances, and withdrawal requests are stored as CoFHE euint128 handles.',
  },
  {
    icon: Banknote,
    title: 'Treasury settlement',
    copy: 'The employer funds ETH liquidity, and employees claim verified payouts from the contract.',
  },
  {
    icon: Users,
    title: 'On-chain roster',
    copy: 'Wave 4 adds employee registration, active status controls, and batch payroll safeguards.',
  },
  {
    icon: ShieldCheck,
    title: 'Proof-backed claims',
    copy: 'Withdrawals use decryptForTx plus on-chain verifyDecryptResult before ETH moves.',
  },
];

export function Home() {
  return (
    <div className="overview-page">
      <motion.header className="overview-hero" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <p className="eyebrow">Overview</p>
          <h1>FhePay keeps payroll private until settlement.</h1>
          <p className="hero-copy">
            A Sepolia payroll app using Fhenix CoFHE for encrypted salary arithmetic, employee-scoped decrypts, and
            verifiable ETH claims.
          </p>
          <div className="hero-actions">
            <Link to="/" className="btn">
              Open app
            </Link>
            <Link to="/how-it-works" className="btn btn-secondary">
              Architecture
            </Link>
          </div>
        </div>
        <div className="flow-board" aria-hidden>
          <div>Encrypt</div>
          <span />
          <div>Accrue</div>
          <span />
          <div>Verify</div>
          <span />
          <div>Claim</div>
        </div>
      </motion.header>

      <section className="feature-grid">
        {cards.map(({ icon: Icon, title, copy }) => (
          <article className="feature-card" key={title}>
            <div className="feature-icon">
              <Icon size={20} />
            </div>
            <h2>{title}</h2>
            <p className="prose-muted">{copy}</p>
          </article>
        ))}
      </section>

      <section className="roadmap-band">
        <div>
          <p className="eyebrow">Wave status</p>
          <h2>Wave 3 and Wave 4 are implemented in this build.</h2>
        </div>
        <Link to="/resources" className="btn btn-secondary">
          View docs
        </Link>
      </section>
    </div>
  );
}
