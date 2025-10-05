import ClientImage from '@/app/components/ClientImage'

export const metadata = { title: 'Spring Mass System | Simulators' }

export default function SpringMassComingSoon() {
  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col">
          <h1 className="h3 mb-0">Spring Mass System</h1>
          <p className="text-muted">This simulator is under progress.</p>
        </div>
      </div>
      <div className="text-center p-5 bg-light rounded border">
        <ClientImage src="/coming-soon.png" alt="Coming soon" style={{ maxWidth: 280 }} width={280} height={200} />
        <div className="mt-3">Coming soon</div>
      </div>
    </div>
  )
}
