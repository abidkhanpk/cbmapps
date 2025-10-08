export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer
      className="app-footer"
      style={{
        marginLeft: 'var(--sidebar-collapsed-width)',
        background: '#f9fafb',
        borderTop: '1px solid #e5e7eb',
        boxShadow: '0 -1px 2px rgba(2, 6, 23, 0.04)',
      }}
    >
      <div className="container-fluid py-3 px-4 d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2 text-muted small">
          <span>© {year} CBMAPPS</span>
          <span className="d-none d-sm-inline">•</span>
          <span className="d-none d-sm-inline">All rights reserved</span>
        </div>
        <nav className="d-flex align-items-center gap-3 small">
          <a className="text-muted text-decoration-none" href="#">Privacy</a>
          <a className="text-muted text-decoration-none" href="#">Terms</a>
          <a className="text-muted text-decoration-none" href="#">Status</a>
          <span className="text-muted">v1.0</span>
        </nav>
      </div>
      <style jsx global>{`
        @media (max-width: 768px) {
          .app-footer { margin-left: 0 !important; }
        }
      `}</style>
    </footer>
  )
}
