import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
        <p className="badge" style={{ marginBottom: '1rem' }}>
          404
        </p>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', margin: '0 0 0.75rem' }}>Page not found</h1>
        <p className="prose-muted" style={{ maxWidth: 400, margin: '0 auto 1.5rem' }}>
          That route does not exist. Head back to the home page or open the payroll console.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
          <Link to="/" className="btn">
            Home
          </Link>
          <Link to="/app" className="btn btn-ghost">
            App
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
