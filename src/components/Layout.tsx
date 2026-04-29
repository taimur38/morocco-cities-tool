import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
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
