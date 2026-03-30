import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scroll to top on client-side navigation for predictable UX */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);
  return null;
}
