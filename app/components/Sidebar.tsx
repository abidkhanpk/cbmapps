'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { hasPermission, PERMISSIONS } from '@/lib/rbac/permissions';
import { useState } from 'react';

interface MenuItem {
  href?: string;
  icon: string;
  label: string;
  permission?: any;
  children?: MenuItem[];
}

const menu: MenuItem[] = [
  { href: '/home', icon: 'bi-house', label: 'Home' },
  {
    icon: 'bi-joystick',
    label: 'Simulators',
    children: [
      { href: '/simulators/signal-generator', icon: 'bi-activity', label: 'Signal Generator' },
      { href: '/simulators/spring-mass-system', icon: 'bi-diagram-3', label: 'Spring Mass System' },
      { href: '/simulators/mode-shapes-simulator', icon: 'bi-shuffle', label: 'Mode Shapes Demo' },
    ],
  },
  { href: '/assets', icon: 'bi-building', label: 'Asset Register', permission: PERMISSIONS.VIEW_ASSET },
  {
    icon: 'bi-clipboard-data',
    label: 'FMECA',
    permission: PERMISSIONS.VIEW_FMECA_STUDY,
    children: [
      { href: '/fmeca', icon: 'bi-layout-text-window', label: 'Overview' },
      { href: '/fmeca?tab=studies', icon: 'bi-journal-check', label: 'FMECA Studies' },
      { href: '/actions?entity=fmeca_item', icon: 'bi-check-square', label: 'Actions' },
      { href: '/audit?entity_type=fmeca_item', icon: 'bi-journal-text', label: 'Audit Log', permission: PERMISSIONS.VIEW_AUDIT_LOG },
    ],
  },
  { href: '/fta', icon: 'bi-diagram-3', label: 'FTA' },
  { href: '/contact', icon: 'bi-envelope', label: 'Contact Us' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRoles = (session?.user as any)?.roles || [];
  const [open, setOpen] = useState<Record<string, boolean>>({ simulators: true, fmeca: true });

  const canView = (item: MenuItem) => !item.permission || hasPermission(userRoles, item.permission);

  const isActive = (href?: string) => !!href && (pathname === href || (href.includes('?') && pathname === href.split('?')[0]));

  const renderItem = (item: MenuItem) => {
    if (!canView(item)) return null;

    if (item.children && item.children.length > 0) {
      const key = item.label.toLowerCase().replace(/\s+/g, '-');
      const anyChildActive = item.children.some(c => isActive(c.href));
      const expanded = open[key] ?? anyChildActive;
      return (
        <li key={item.label} className="nav-item">
          <button
            className={`nav-link d-flex align-items-center w-100 text-start ${anyChildActive ? 'active' : ''}`}
            onClick={() => setOpen(prev => ({ ...prev, [key]: !expanded }))}
          >
            <i className={`${item.icon} me-2`}></i>
            <span className="label flex-grow-1">{item.label}</span>
            <i className={`bi ms-auto ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
          </button>
          {expanded && (
            <ul className="nav flex-column ms-3">
              {item.children.map(child => renderItem(child) as any)}
            </ul>
          )}
        </li>
      );
    }

    return (
      <li key={item.href || item.label} className="nav-item">
        <Link href={item.href!} className={`nav-link d-flex align-items-center ${isActive(item.href) ? 'active' : ''}`}>
          <i className={`${item.icon} me-2`}></i>
          <span className="label">{item.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav className="sidebar" id="sidebar">
      <div className="p-3 d-flex justify-content-between align-items-center">
        <Link href="/home" className="navbar-brand text-white text-decoration-none d-flex align-items-center">
          <i className="bi bi-clipboard-data me-2 brand-icon"></i>
          <span className="label">CBMAPPS</span>
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
        {menu.map(renderItem)}
      </ul>
    </nav>
  );
}