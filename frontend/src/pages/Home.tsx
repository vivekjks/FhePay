import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  FileSpreadsheet,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import heroMark from '../assets/fhepay-mark.svg';

const capabilities = [
  {
    icon: LockKeyhole,
    title: 'Encrypted payroll core',
    copy: 'Salaries, balances, bonuses, and withdrawal requests are encrypted before they reach the contract.',
  },
  {
    icon: WalletCards,
    title: 'Treasury-backed claims',
    copy: 'Payroll accrues privately, then employees claim ETH through a proof-verified settlement path.',
  },
  {
    icon: UsersRound,
    title: 'Operator console',
    copy: 'Roster controls, payroll groups, CSV import, delegated admins, and recurring upkeep are built into the app.',
  },
  {
    icon: ShieldCheck,
    title: 'Selective disclosure',
    copy: 'Auditors can decrypt only the employee handles explicitly granted to their wallet.',
  },
];

const operations = [
  ['Admin control', 'Safe-ready ownership handoff, delegated payroll and treasury admins, and role-aware workspaces.'],
  ['Payroll scale', 'Roster management, batch payroll, payroll groups, CSV import, and recurring upkeep hooks.'],
  ['Private rewards', 'Encrypted salaries, confidential bonuses, private balances, and employee-owned withdrawal claims.'],
  ['Audit access', 'Selective disclosure lets auditors review only the encrypted handles granted to their wallet.'],
  ['Treasury safety', 'On-chain alert thresholds, liquidity visibility, and proof-verified ETH settlement paths.'],
];

const proofPoints = [
  { label: 'Network', value: 'Ethereum Sepolia' },
  { label: 'Privacy layer', value: 'Fhenix CoFHE' },
  { label: 'Core type', value: 'euint128' },
  { label: 'Verification', value: '17 contract tests' },
];

const flow = [
  { icon: FileSpreadsheet, title: 'Encrypt setup', copy: 'Salary and withdrawal inputs are encrypted in the browser.' },
  { icon: CalendarClock, title: 'Run payroll', copy: 'Single, batch, and group payroll update encrypted balances.' },
  { icon: KeyRound, title: 'Request claim', copy: 'The contract gates pending withdrawals with FHE comparisons.' },
  { icon: Banknote, title: 'Settle ETH', copy: 'The client submits a decryptForTx proof and the contract transfers ETH.' },
];

export function Home() {
  return (
    <div className="home-page">
      <motion.section className="home-hero home-hero-polished" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="home-hero-copy">
          <div className="hero-kicker">
            <span>Production payroll console</span>
            <span>Live on Sepolia</span>
          </div>
          <h1>Trustless payroll. Private numbers.</h1>
          <p className="hero-copy">
            FhePay gives employers a production-style payroll console while keeping salary math confidential with
            Fhenix CoFHE and settling verified ETH claims on-chain.
          </p>
          <div className="hero-actions">
            <Link to="/app" className="btn">
              Launch live app
              <ArrowRight size={16} />
            </Link>
            <Link to="/how-it-works" className="btn btn-secondary">
              View proof flow
            </Link>
          </div>
          <div className="home-proof-grid" aria-label="Live project signals">
            {proofPoints.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <figure className="hero-brand-card">
          <img src={heroMark} alt="FhePay confidential payroll logo mark" />
        </figure>
      </motion.section>

      <section className="home-command-strip" aria-label="Primary product areas">
        <Link to="/app">
          <WalletCards size={16} />
          Payroll console
        </Link>
        <Link to="/how-it-works">
          <KeyRound size={16} />
          CoFHE flow
        </Link>
        <a href="https://sepolia.etherscan.io/address/0xd36A6AA303b4c17eCBDB5c0f47B9f216683436CC" target="_blank" rel="noreferrer">
          <ShieldCheck size={16} />
          Contract
        </a>
        <a href="https://cofhe-docs.fhenix.zone/" target="_blank" rel="noreferrer">
          <Sparkles size={16} />
          Fhenix docs
        </a>
      </section>

      <section className="home-section home-capabilities">
        <div className="section-heading">
          <p className="eyebrow">Product surface</p>
          <h2>A real payroll workflow, not a static demo.</h2>
          <p className="prose-muted">
            The app covers employer operations, employee claims, auditor review, and treasury safety from one connected
            Sepolia deployment.
          </p>
        </div>
        <div className="capability-list polished-list">
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

      <section className="home-flow-panel">
        <div className="section-heading">
          <p className="eyebrow">Confidential settlement path</p>
          <h2>Every sensitive amount stays encrypted until the claim proof.</h2>
        </div>
        <div className="home-flow home-flow-rich">
          {flow.map(({ icon: Icon, title, copy }, index) => (
            <article className="home-flow-step" key={title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <Icon size={19} />
              <strong>{title}</strong>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="operations-section" aria-label="Production capabilities">
        <div className="section-heading">
          <p className="eyebrow">Production capabilities</p>
          <h2>Everything needed to run private payroll from one place.</h2>
        </div>
        <div className="operations-list">
          {operations.map(([title, copy]) => (
            <article key={title}>
              <span>{title}</span>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-final home-final-polished">
        <div>
          <p className="eyebrow">Ready to run</p>
          <h2>Open the console, connect Sepolia, and run the private payroll flow end to end.</h2>
        </div>
        <Link to="/app" className="btn">
          Open dashboard
          <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
