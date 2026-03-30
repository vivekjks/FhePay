import { Link, NavLink, Routes, Route } from 'react-router-dom';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Resources } from './pages/Resources';
import { Status } from './pages/Status';
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
            <NavLink to="/resources" className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}>
              Resources
            </NavLink>
            <NavLink
              to="/how-it-works"
              className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
            >
              How it works
            </NavLink>
            <NavLink to="/status" className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}>
              Status
            </NavLink>
          </div>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/app" element={<Dashboard />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/status" element={<Status />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
