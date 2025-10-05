'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function TopNavbar() {
  const { data: session } = useSession();
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

  return (
    <nav className="navbar top-navbar">
      <div className="container-fluid">
        {/* Sidebar toggle for mobile */}
        <button
          className="btn btn-link text-white d-lg-none me-2"
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
        <Link href="/home" className="navbar-brand d-flex align-items-center text-white">
          <i className="bi bi-clipboard-data me-2"></i>
          <span>CBMAPPS</span>
        </Link>

        <div className="d-flex align-items-center ms-auto">
          {/* Search */}
          <form className="d-none d-md-flex me-3" onSubmit={handleSearch}>
            <div className="input-group input-group-sm">
              <input
                className="form-control"
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '220px' }}
              />
              <button className="btn btn-outline-light" type="submit">
                <i className="bi bi-search"></i>
              </button>
            </div>
          </form>

          {/* User menu */}
          <div className="dropdown">
            <button
              className="btn btn-link text-white text-decoration-none dropdown-toggle"
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