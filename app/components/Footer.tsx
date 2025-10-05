export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-top bg-white">
      <div className="container-fluid py-3 d-flex justify-content-between align-items-center">
        <span className="text-muted small">© {year} Reliability Suite</span>
        <span className="text-muted small">v1.0</span>
      </div>
    </footer>
  )
}
