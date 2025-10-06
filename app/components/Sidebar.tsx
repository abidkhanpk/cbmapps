'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { hasPermission, PERMISSIONS } from '@/lib/rbac/permissions';
import { useEffect, useState } from 'react';

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
      { href: '/fmeca/overview', icon: 'bi-layout-text-window', label: 'Overview' },
      { href: '/fmeca/studies', icon: 'bi-journal-check', label: 'FMECA Studies' },
      { href: '/actions?entity=fmeca_item', icon: 'bi-check-square', label: 'Actions' },
      { href: '/audit?entity_type=fmeca_item', icon: 'bi-journal-text', label: 'Audit Log', permission: PERMISSIONS.VIEW_AUDIT_LOG },
    ],
  },
  { href: '/fta', icon: 'bi-diagram-3', label: 'FTA' },
  { href: '/contact', icon: 'bi-envelope', label: 'Contact Us' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const userRoles = (session?.user as any)?.roles || [];
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // Start collapsed by default and keep content width at collapsed size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sidebar = document.querySelector('.sidebar');
      sidebar?.classList.add('collapsed');
      document.body.classList.add('sidebar-collapsed');
      document.querySelector('.main-content')?.classList.add('expanded');
    }
  }, []);

  // Ensure default open group based on current route, including cross-module children
  useEffect(() => {
    const defaults: Record<string, boolean> = {};
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      if (
        pathname.startsWith('/fmeca') ||
        (pathname === '/actions' && search.get('entity') === 'fmeca_item') ||
        (pathname === '/audit' && search.get('entity_type') === 'fmeca_item')
      ) {
        defaults['fmeca'] = true;
      }
      if (pathname.startsWith('/simulators')) {
        defaults['simulators'] = true;
      }
    }
    setOpen(defaults);
  }, [pathname]);

  const canView = (item: MenuItem) => !item.permission || hasPermission(userRoles, item.permission);

  const isActive = (href?: string) => {
    if (!href) return false;
    try {
      const [hrefPath, hrefQuery] = href.split('?');
      if (pathname !== hrefPath) return false;
      if (!hrefQuery) return true;
      const hrefParams = new URLSearchParams(hrefQuery);
      for (const [k, v] of Array.from(hrefParams.entries())) {
        if (searchParams.get(k) !== v) return false;
      }
      return true;
    } catch {
      return pathname === href;
    }
  };

  const renderItem = (item: MenuItem, parentKey?: string) => {
    if (!canView(item)) return null;

    if (item.children && item.children.length > 0) {
      const key = item.label.toLowerCase().replace(/\s+/g, '-');
      const anyChildActive = item.children.some(c => isActive(c.href));
      const expanded = open[key] ?? anyChildActive;
      return (
        <li key={item.label} className="nav-item">
          <button
            className={`nav-link d-flex align-items-center w-100 text-start ${expanded || anyChildActive ? 'open' : ''}`}
            title={item.label}
            aria-label={item.label}
            onClick={() => {
              // Only one expanded at a time
              setOpen({ [key]: !expanded } as any);
            }}
          >
            <i className={`${item.icon} me-2`}></i>
            <span className="label flex-grow-1">{item.label}</span>
            <i className={`bi ms-auto ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
          </button>
          {expanded && (
            <ul className="nav flex-column ms-3">
              {item.children.map(child => renderItem(child, key) as any)}
            </ul>
          )}
        </li>
      );
    }

    return (
      <li key={item.href || item.label} className="nav-item">
        <Link
          href={item.href!}
          className={`nav-link d-flex align-items-center ${isActive(item.href) ? 'active' : ''}`}
          title={item.label}
          aria-label={item.label}
          onClick={() => {
            // Keep parent expanded if clicking within a group
            if (parentKey) {
              setOpen({ [parentKey]: true });
            } else {
              setOpen({});
            }
          }}
        >
          <i className={`${item.icon} me-2`}></i>
          <span className="label">{item.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav className="sidebar" id="sidebar">
      <ul className="nav nav-pills flex-column">
        {menu.map((item) => renderItem(item))}
      </ul>
    </nav>
  );
}