'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { hasPermission, PERMISSIONS } from '@/lib/rbac/permissions';

const menuItems = [
  {
    href: '/dashboard',
    icon: 'bi-speedometer2',
    label: 'Dashboard',
    permission: null,
  },
  {
    href: '/assets',
    icon: 'bi-building',
    label: 'Assets',
    permission: PERMISSIONS.VIEW_ASSET,
  },
  {
    href: '/fmeca',
    icon: 'bi-clipboard-data',
    label: 'FMECA',
    permission: PERMISSIONS.VIEW_FMECA_STUDY,
  },
  {
    href: '/cm/tasks',
    icon: 'bi-gear',
    label: 'CM Tasks',
    permission: PERMISSIONS.VIEW_CM_TASK,
  },
  {
    href: '/cm/readings',
    icon: 'bi-graph-up',
    label: 'CM Readings',
    permission: PERMISSIONS.VIEW_CM_TASK,
  },
  {
    href: '/actions',
    icon: 'bi-check-square',
    label: 'Actions',
    permission: PERMISSIONS.VIEW_ACTION,
  },
  {
    href: '/users',
    icon: 'bi-people',
    label: 'Users',
    permission: PERMISSIONS.MANAGE_USERS,
  },
  {
    href: '/audit',
    icon: 'bi-journal-text',
    label: 'Audit Log',
    permission: PERMISSIONS.VIEW_AUDIT_LOG,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRoles = (session?.user as any)?.roles || [];

  const filteredMenuItems = menuItems.filter(item => 
    !item.permission || hasPermission(userRoles, item.permission)
  );

  return (
    <nav className="sidebar" id="sidebar">
      <div className="p-3 d-flex justify-content-between align-items-center">
        <Link href="/home" className="navbar-brand text-white text-decoration-none d-flex align-items-center">
          <i className="bi bi-clipboard-data me-2 brand-icon"></i>
          <span className="label">Reliability Suite</span>
        </Link>
        <button
          className="btn btn-sm btn-outline-light d-none d-md-inline"
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              document.querySelector('.sidebar')?.classList.toggle('collapsed');
              document.querySelector('.main-content')?.classList.toggle('expanded');
            }
          }}
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
        >
          <i className="bi bi-list"></i>
        </button>
      </div>
      
      <ul className="nav nav-pills flex-column">
        {filteredMenuItems.map((item) => (
          <li key={item.href} className="nav-item">
            <Link
              href={item.href}
              className={`nav-link d-flex align-items-center ${pathname === item.href ? 'active' : ''}`}
            >
              <i className={`${item.icon} me-2`}></i>
              <span className="label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}