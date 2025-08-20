'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function TopNavbar() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/login' });
  };

  return (
    <nav className="top-navbar d-flex justify-content-between align-items-center">
      <div className="d-flex align-items-center">
        <button
          className="btn btn-link d-md-none sidebar-toggle"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#sidebar"
        >
          <i className="bi bi-list"></i>
        </button>
        
        <form className="d-flex ms-3" onSubmit={handleSearch}>
          <div className="input-group">
            <input
              className="form-control"
              type="search"
              placeholder="Search assets, components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '300px' }}
            />
            <button className="btn btn-outline-secondary" type="submit">
              <i className="bi bi-search"></i>
            </button>
          </div>
        </form>
      </div>

      <div className="d-flex align-items-center">
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
    </nav>
  );
}