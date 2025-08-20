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
    label: 'FMECA Studies',
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
    <nav className="sidebar">
      <div className="p-3">
        <Link href="/dashboard" className="navbar-brand text-white text-decoration-none">
          <i className="bi bi-clipboard-data me-2"></i>
          FMECA System
        </Link>
      </div>
      
      <ul className="nav nav-pills flex-column">
        {filteredMenuItems.map((item) => (
          <li key={item.href} className="nav-item">
            <Link
              href={item.href}
              className={`nav-link ${pathname === item.href ? 'active' : ''}`}
            >
              <i className={`${item.icon} me-2`}></i>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}