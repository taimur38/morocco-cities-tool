import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();
  useEffect(() => {
    // No hash: jump to top on route change.
    if (!location.hash) {
      window.scrollTo({ top: 0, left: 0 });
      return;
    }
    // Hash present: scroll to the matching element. The element may not be in
    // the DOM yet — e.g. /#cities targets a section that only renders after
    // panel data loads — so observe the DOM until it appears.
    const id = location.hash.slice(1);
    const scrollTo = () => {
      const el = document.getElementById(id);
      if (!el) return false;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    };
    if (scrollTo()) return;
    const observer = new MutationObserver(() => {
      if (scrollTo()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [location.pathname, location.hash]);

  return (
    <>
      <header className="site-header">
        <h1>Morocco Cities</h1>
        <nav>
          <Link to="/">Overview</Link>
          <Link to="/#cities">Cities</Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
