import { Link } from 'react-router-dom';
import { ExternalLink, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-shell">
        <div className="footer-mark">
          <span className="footer-logo">FhePay</span>
          <span className="status-pill status-ok">
            <ShieldCheck size={14} />
            Sepolia
          </span>
        </div>
        <p className="footer-copy">Confidential payroll powered by Fhenix CoFHE.</p>
        <nav className="footer-links" aria-label="Footer">
          <Link to="/">Home</Link>
          <Link to="/app">App</Link>
          <Link to="/how-it-works">Flow</Link>
          <a href="https://cofhe-docs.fhenix.zone/" target="_blank" rel="noreferrer">
            Docs
            <ExternalLink size={13} />
          </a>
        </nav>
      </div>
    </footer>
  );
}
