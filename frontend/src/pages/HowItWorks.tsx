import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowDown, Banknote, Binary, FileKey2, LockKeyhole, Route, ShieldCheck, WalletCards } from 'lucide-react';

const iv = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.4 },
};

const flow = [
  {
    icon: LockKeyhole,
    title: 'Browser encrypts payroll inputs',
    copy: 'Salary and withdrawal amounts are encrypted client-side before they touch the contract.',
    tag: 'encryptInputs',
  },
  {
    icon: Binary,
    title: 'FhePay stores encrypted handles',
    copy: 'The roster is public, but salary, balance, and pending withdrawal values stay as euint128 ciphertext handles.',
    tag: 'FHE.allow',
  },
  {
    icon: Route,
    title: 'Payroll uses FHE arithmetic',
    copy: 'paySalary, batchPaySalary, bonuses, and groups add encrypted salary handles to encrypted balances.',
    tag: 'FHE.add',
  },
  {
    icon: ShieldCheck,
    title: 'Withdrawal checks stay private',
    copy: 'requestWithdraw uses encrypted comparison and selection so insufficient requests do not reveal balances.',
    tag: 'FHE.gte + select',
  },
  {
    icon: FileKey2,
    title: 'Client prepares settlement proof',
    copy: 'The pending claim becomes decryptable for transaction settlement through decryptForTx.',
    tag: 'decryptForTx',
  },
  {
    icon: Banknote,
    title: 'Contract verifies and pays ETH',
    copy: 'claimWithdrawal verifies the CoFHE proof and transfers ETH from the funded treasury.',
    tag: 'verify + transfer',
  },
];

const employerSteps = [
  'Fund the treasury with ETH so claims can settle on-chain.',
  'Encrypt each salary in the browser and store it with setSalary.',
  'Pause, reactivate, import, group, and delegate payroll operations.',
  'Run one employee, a batch, or a due payroll group.',
];

const employeeSteps = [
  'Connect the employee wallet and wait for CoFHE readiness.',
  'Decrypt salary and balance locally with a self permit.',
  'Request an encrypted withdrawal amount.',
  'Submit the decryptForTx proof to claim ETH or cancel the pending claim.',
];

const safetyRows = [
  ['Privacy boundary', 'Salary and balance math is private; final ETH claim amounts are public settlement.'],
  ['Role boundary', 'Owner, payroll admin, treasury admin, auditor, and employee flows are separated in the UI.'],
  ['Treasury boundary', 'The alert threshold can block payroll when claim liquidity is below the configured floor.'],
];

export function HowItWorks() {
  return (
    <div className="flow-page">
      <motion.header className="flow-hero" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow">Proof flow</p>
        <h1>How private payroll becomes verified ETH.</h1>
        <p className="hero-copy">
          FhePay keeps salary arithmetic encrypted, exposes only operational metadata, and uses CoFHE transaction
          decryption proofs for the final on-chain claim.
        </p>
      </motion.header>

      <motion.section className="flow-map-panel" {...iv}>
        <div className="flow-map">
          {flow.map(({ icon: Icon, title, copy, tag }, index) => (
            <div className="flow-map-item" key={title}>
              <article>
                <span className="step-num">{String(index + 1).padStart(2, '0')}</span>
                <Icon size={21} />
                <strong>{title}</strong>
                <p>{copy}</p>
                <code>{tag}</code>
              </article>
              {index < flow.length - 1 && (
                <span className="flow-map-arrow" aria-hidden="true">
                  <ArrowDown size={18} />
                </span>
              )}
            </div>
          ))}
        </div>
      </motion.section>

      <section className="flow-split">
        <motion.article className="card lifecycle-card" {...iv}>
          <div className="form-title">
            <WalletCards size={19} />
            <h2 className="section-title">Employer lifecycle</h2>
          </div>
          <ol className="clean-list">
            {employerSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </motion.article>

        <motion.article className="card lifecycle-card" {...iv}>
          <div className="form-title">
            <LockKeyhole size={19} />
            <h2 className="section-title">Employee lifecycle</h2>
          </div>
          <ol className="clean-list">
            {employeeSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </motion.article>
      </section>

      <motion.section className="card boundary-card" {...iv}>
        <h2 className="section-title">Production boundaries</h2>
        <div className="boundary-grid">
          {safetyRows.map(([title, copy]) => (
            <article key={title}>
              <strong>{title}</strong>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </motion.section>

      <div className="flow-actions">
        <Link to="/app" className="btn">
          Open dashboard
        </Link>
        <a href="https://cofhe-docs.fhenix.zone/" target="_blank" rel="noreferrer" className="btn btn-secondary">
          CoFHE docs
        </a>
      </div>
    </div>
  );
}
