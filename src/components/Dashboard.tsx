import Link from 'next/link';
import Image from 'next/image';

const simulators = [
  {
    title: 'Signal Generator & FFT',
    description: 'Explore signal types, FFT, aliasing, windowing, and averaging.',
    image: '/images/signal-generator.png',
    href: '/signal-generator',
  },
  {
    title: 'Spring-Mass System',
    description: 'Simulate vibration, resonance, bode plots, and phase response.',
    image: '/images/spring-mass.png',
    href: '/spring-mass',
  },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-center mb-8">Vibration & Signal Processing Simulators</h1>
      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto">
        {simulators.map((sim) => (
          <div key={sim.title} className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center">
            <Image src={sim.image} alt={sim.title} width={80} height={80} className="mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-center">{sim.title}</h2>
            <p className="text-gray-600 mb-4 text-center">{sim.description}</p>
            <Link href={sim.href} className="mt-auto w-full">
              <button className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">Open Simulator</button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
