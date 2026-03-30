import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

function MarqueeBrands() {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <span key={`a-${i}`} className="footer-brand" style={{ opacity: i % 2 === 0 ? 1 : 0.4 }}>
          FhePay
        </span>
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <span key={`b-${i}`} className="footer-brand" style={{ opacity: i % 2 === 0 ? 1 : 0.4 }}>
          FhePay
        </span>
      ))}
    </>
  );
}

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        padding: '2rem 1rem',
        marginTop: 'auto',
        background: 'linear-gradient(180deg, transparent, rgba(255,182,193,0.05))',
      }}
    >
      <motion.div
        className="marquee-wrap"
        style={{ marginBottom: '1.25rem' }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="footer-marquee-inner" aria-hidden>
          <MarqueeBrands />
        </div>
      </motion.div>
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.9rem',
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        <p style={{ margin: 0 }}>
          Confidential payroll powered by{' '}
          <a href="https://cofhe-docs.fhenix.zone/" target="_blank" rel="noreferrer">
            Fhenix CoFHE
          </a>
          . Amounts stay encrypted on Ethereum Sepolia.
        </p>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span className="badge">Sepolia</span>
          <Link to="/">Home</Link>
          <Link to="/app">App</Link>
          <Link to="/resources">Resources</Link>
          <a href="https://cofhe-docs.fhenix.zone/" target="_blank" rel="noreferrer">
            Docs
          </a>
        </div>
      </div>
    </footer>
  );
}
