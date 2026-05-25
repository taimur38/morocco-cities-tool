import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();
  useEffect(() => {
    // Hash-anchored deep links (e.g. /#cities) should land on the anchor, not
    // the top. Browser handles that on hash navigation; only override when
    // there's no hash to honor.
    if (!location.hash) {
      window.scrollTo({ top: 0, left: 0 });
    }
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
