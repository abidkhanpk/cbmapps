import { getServerSession } from 'next-auth'
import getAuthOptions from '@/lib/auth/config'
import Link from 'next/link'

export const metadata = {
  title: 'Home | Reliability Suite',
}

export default async function HomePage() {
  const session = await getServerSession(getAuthOptions())

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col">
          <h1 className="h3 mb-0">Home</h1>
          <p className="text-muted">Welcome{session?.user?.name ? `, ${session.user.name}` : ''}. Choose a module from the menu.</p>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-6 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Simulators</h5>
              <p className="card-text">Signal Generator, Spring Mass System, Mode Shapes, and Rotating Machine (coming soon).</p>
              <Link href="/simulators" className="btn btn-outline-primary">
                Open Simulators
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Asset Register</h5>
              <p className="card-text">Manage Plant, Areas, Equipment, Assets, and Components hierarchy.</p>
              <Link href="/assets" className="btn btn-outline-primary">
                Open Asset Register
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">FMECA</h5>
              <p className="card-text">Create FMECA studies, manage items, and link corrective actions.</p>
              <Link href="/fmeca" className="btn btn-outline-primary">
                Open FMECA
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Actions</h5>
              <p className="card-text">View and manage all corrective actions across the suite.</p>
              <Link href="/actions" className="btn btn-outline-primary">
                Open Actions
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">FTA</h5>
              <p className="card-text">Fault Tree Analysis module (coming soon).</p>
              <Link href="/fta" className="btn btn-outline-secondary">
                Open FTA
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Contact Us</h5>
              <p className="card-text">Get in touch or send feedback.</p>
              <Link href="/contact" className="btn btn-outline-secondary">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
