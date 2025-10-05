import Link from 'next/link'

export const metadata = { title: 'Simulators | CBMAPPS' }

export default function SimulatorsIndex() {
  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col">
          <h1 className="h3 mb-0">Simulators</h1>
          <p className="text-muted">Interactive engineering simulators</p>
        </div>
      </div>
      <div className="row g-3">
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 text-center p-3">
            <div className="my-3"><i className="bi bi-activity display-6"></i></div>
            <h5>Signal Generator</h5>
            <p className="text-muted">Coming soon</p>
            <Link href="/simulators/signal-generator" className="btn btn-outline-secondary">Open</Link>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 text-center p-3">
            <div className="my-3"><i className="bi bi-diagram-3 display-6"></i></div>
            <h5>Spring Mass System</h5>
            <p className="text-muted">Coming soon</p>
            <Link href="/simulators/spring-mass-system" className="btn btn-outline-secondary">Open</Link>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 text-center p-3">
            <div className="my-3"><i className="bi bi-shuffle display-6"></i></div>
            <h5>Mode Shapes Simulator</h5>
            <p className="text-muted">Coming soon</p>
            <Link href="/simulators/mode-shapes-simulator" className="btn btn-outline-secondary">Open</Link>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 text-center p-3">
            <div className="my-3"><i className="bi bi-arrow-repeat display-6"></i></div>
            <h5>Rotating Machine</h5>
            <p className="text-muted">Coming soon</p>
            <Link href="/simulators/rotating-machine" className="btn btn-outline-secondary">Open</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
