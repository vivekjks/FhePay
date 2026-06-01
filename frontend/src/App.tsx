import { Link, NavLink, Navigate, Routes, Route } from 'react-router-dom';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { HowItWorks } from './pages/HowItWorks';
import { NotFound } from './pages/NotFound';
import { useCofheSync } from './hooks/useCofheSync';

export function App() {
  useCofheSync();
  return (
    <div className="app-shell">
      <header className="site-header">
        <nav className="site-nav">
          <Link to="/" className="site-logo">
            FhePay
          </Link>
          <div className="site-nav-links">
            <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')} end>
              Home
            </NavLink>
            <NavLink to="/app" className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}>
              App
            </NavLink>
            <NavLink
              to="/how-it-works"
              className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
            >
              Flow
            </NavLink>
          </div>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/app" element={<Dashboard />} />
          <Route path="/overview" element={<Navigate to="/" replace />} />
          <Route path="/resources" element={<Navigate to="/" replace />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/status" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
