import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Banknote, KeyRound, LockKeyhole, ShieldCheck, UsersRound } from 'lucide-react';

const capabilities = [
  {
    icon: LockKeyhole,
    title: 'Encrypted payroll',
    copy: 'Salaries, balances, bonuses, and withdrawal requests are encrypted before they reach the contract.',
  },
  {
    icon: Banknote,
    title: 'Real settlement',
    copy: 'Employees claim ETH from a funded treasury after a proof-backed decryption flow.',
  },
  {
    icon: UsersRound,
    title: 'Team operations',
    copy: 'Roster controls, payroll groups, CSV import, delegated admins, and recurring payroll hooks are built in.',
  },
  {
    icon: BadgeCheck,
    title: 'Selective review',
    copy: 'Auditors can decrypt only the employee handles explicitly disclosed to their wallet.',
  },
];

const flow = ['Encrypt salary', 'Run payroll', 'Request claim', 'Verify and settle'];

export function Home() {
  return (
    <div className="home-page">
      <motion.section className="home-hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="home-hero-copy">
          <p className="eyebrow">Confidential payroll on Sepolia</p>
          <h1>Payroll privacy with on-chain settlement.</h1>
          <p className="hero-copy">
            FhePay lets employers run encrypted payroll while employees privately view balances and claim verified ETH
            payouts from the treasury.
          </p>
          <div className="hero-actions">
            <Link to="/app" className="btn">
              Open app
              <ArrowRight size={16} />
            </Link>
            <Link to="/how-it-works" className="btn btn-secondary">
              See the flow
            </Link>
          </div>
        </div>
        <div className="home-ledger" aria-label="FhePay live capabilities">
          <div>
            <span>Network</span>
            <strong>Ethereum Sepolia</strong>
          </div>
          <div>
            <span>Privacy layer</span>
            <strong>Fhenix CoFHE</strong>
          </div>
          <div>
            <span>Core type</span>
            <strong>euint128</strong>
          </div>
          <div>
            <span>Settlement</span>
            <strong>Verified ETH claims</strong>
          </div>
        </div>
      </motion.section>

      <section className="home-strip" aria-label="Product pillars">
        <span>
          <ShieldCheck size={16} />
          Private balances
        </span>
        <span>
          <KeyRound size={16} />
          Role-based controls
        </span>
        <span>
          <BadgeCheck size={16} />
          Auditor disclosure
        </span>
        <span>
          <Banknote size={16} />
          Treasury-backed claims
        </span>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <p className="eyebrow">What it does</p>
          <h2>Everything needed for a private payroll demo.</h2>
        </div>
        <div className="capability-list">
          {capabilities.map(({ icon: Icon, title, copy }) => (
            <article className="capability-row" key={title}>
              <Icon size={20} />
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-flow-section">
        <div className="section-heading">
          <p className="eyebrow">How it runs</p>
          <h2>Simple for users, private under the hood.</h2>
        </div>
        <div className="home-flow">
          {flow.map((item, index) => (
            <div className="home-flow-step" key={item}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="home-final">
        <div>
          <p className="eyebrow">Ready to operate</p>
          <h2>Use the live console for payroll, claims, groups, and disclosure.</h2>
        </div>
        <Link to="/app" className="btn">
          Launch dashboard
          <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
