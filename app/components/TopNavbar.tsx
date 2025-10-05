'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function TopNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="navbar navbar-expand-lg top-navbar">
      <div className="container-fluid">
        {/* Sidebar toggle for mobile (FMECA sidebar) */}
        <button
          className="btn btn-link d-lg-none me-2"
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              document.querySelector('.sidebar')?.classList.toggle('show');
            }
          }}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          <i className="bi bi-list"></i>
        </button>

        {/* Brand */}
        <Link href="/home" className="navbar-brand d-flex align-items-center">
          <i className="bi bi-clipboard-data me-2"></i>
          <span>Reliability Suite</span>
        </Link>

        {/* Main menu burger */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainMenu"
          aria-controls="mainMenu"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="mainMenu">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link href="/home" className={`nav-link ${isActive('/home') ? 'active' : ''}`}>Home</Link>
            </li>
            <li className="nav-item dropdown">
              <a className="nav-link dropdown-toggle" href="#" id="simDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                Simulators
              </a>
              <ul className="dropdown-menu" aria-labelledby="simDropdown">
                <li><Link className="dropdown-item" href="/simulators/signal-generator">Signal Generator</Link></li>
                <li><Link className="dropdown-item" href="/simulators/spring-mass-system">Spring Mass System</Link></li>
                <li><Link className="dropdown-item" href="/simulators/mode-shapes-simulator">Mode Shapes Simulator</Link></li>
                <li><Link className="dropdown-item" href="/simulators/rotating-machine">Rotating Machine</Link></li>
              </ul>
            </li>
            <li className="nav-item">
              <Link href="/assets" className={`nav-link ${isActive('/assets') ? 'active' : ''}`}>Asset Register</Link>
            </li>
            <li className="nav-item">
              <Link href="/fmeca" className={`nav-link ${isActive('/fmeca') ? 'active' : ''}`}>FMECA</Link>
            </li>
            <li className="nav-item">
              <Link href="/fta" className={`nav-link ${isActive('/fta') ? 'active' : ''}`}>FTA</Link>
            </li>
            <li className="nav-item">
              <Link href="/contact" className={`nav-link ${isActive('/contact') ? 'active' : ''}`}>Contact Us</Link>
            </li>
          </ul>

          {/* Search */}
          <form className="d-flex me-3" onSubmit={handleSearch}>
            <div className="input-group">
              <input
                className="form-control"
                type="search"
                placeholder="Search assets, components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '260px' }}
              />
              <button className="btn btn-outline-secondary" type="submit">
                <i className="bi bi-search"></i>
              </button>
            </div>
          </form>

          {/* User menu */}
          <div className="dropdown">
            <button
              className="btn btn-link text-decoration-none dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
            >
              <i className="bi bi-person-circle me-2"></i>
              {session?.user?.name || session?.user?.email}
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <span className="dropdown-item-text">
                  <small className="text-muted">
                    {(session?.user as any)?.roles?.join(', ') || 'No roles'}
                  </small>
                </span>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item" onClick={handleSignOut}>
                  <i className="bi bi-box-arrow-right me-2"></i>
                  Sign out
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}