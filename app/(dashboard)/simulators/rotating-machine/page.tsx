import dynamic from 'next/dynamic'
import type { Metadata } from 'next'

import './styles/simulator.css'

const RotatingMachineApp = dynamic(() => import('./client/RotatingMachineApp'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center py-16">
      <div className="rounded-lg bg-slate-900/5 px-8 py-6 text-center">
        <p className="text-sm font-semibold tracking-wide text-slate-500">Preparing rotating-machine simulator…</p>
      </div>
    </div>
  ),
})

export const metadata: Metadata = {
  title: 'Rotating Machine Fault Simulator',
  description: 'Interactive vibration diagnostics lab for rotating machinery faults.',
}

export default function RotatingMachineSimulatorPage() {
  return (
    <section className="rotating-machine-page">
      <div className="simulator-shell">
        <RotatingMachineApp />
      </div>
    </section>
  )
}
