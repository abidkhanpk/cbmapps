"use client";
import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] via-white to-[#fff7f9] text-gray-900 flex flex-col">
      <header className="max-w-6xl mx-auto w-full px-6 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-md bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white font-extrabold">cb</div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">cbmapps</h1>
                <p className="text-sm text-gray-600 mt-1">Interactive DSP playground — launch apps from the dashboard</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">Beta</span>
            <nav className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
              <a>Docs</a>
              <a>About</a>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 pb-16">
          <section className="bg-white rounded-3xl shadow-xl p-8 md:p-12 -mt-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <h2 className="text-2xl md:text-3xl font-bold">Launch an app to explore vibrations & signal analysis</h2>
                <p className="mt-3 text-gray-600">Explore vibration analysis concepts — time waveforms, spectra, RMS, bearing fault detection, windowing, and more. Start with the Signal Generator to synthesize and analyze vibrations, or add your own data.</p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/signal-generator" className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-semibold shadow hover:translate-y-[-2px] transition-transform">Open Signal Generator</Link>
                  <button className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700">Explore features</button>
                </div>
              </div>

              <div className="w-full lg:w-1/2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-tr from-indigo-600 to-sky-500 text-white p-4 rounded-xl flex flex-col justify-between transform transition-transform hover:scale-[1.02] hover:-translate-y-1">
                    <div>
                      <div className="text-2xl font-bold">Real-time</div>
                      <div className="mt-2 text-sm opacity-90">Interactive controls, instant preview</div>
                    </div>
                    <div className="mt-4 text-xs opacity-90">Plots · Windowing · Averaging</div>
                  </div>
                  <div className="bg-gradient-to-tr from-rose-500 to-pink-400 text-white p-4 rounded-xl flex flex-col justify-between transform transition-transform hover:scale-[1.02] hover:-translate-y-1">
                    <div>
                      <div className="text-2xl font-bold">Spectral tools</div>
                      <div className="mt-2 text-sm opacity-90">FFT, smoothing and customization</div>
                    </div>
                    <div className="mt-4 text-xs opacity-90">DF estimates · Resolution control</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h3 className="text-lg font-semibold mb-4">Apps</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link href="/signal-generator" className="group">
                <article className="relative h-full bg-white rounded-2xl border border-gray-200 shadow-md p-6 hover:shadow-2xl transform transition duration-300 hover:-translate-y-2 hover:scale-[1.01] focus-within:ring-2 focus-within:ring-indigo-300">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 p-3 rounded-lg bg-gradient-to-tr from-indigo-600 to-sky-500 text-white animate-wave hover:animate-none">
                      {/* inline waveform SVG icon */}
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path d="M2 12h2l2-6 2 12 2-8 2 4 2-10 2 8 2-4 2 6h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-semibold">Signal Generator</h4>
                      <p className="text-sm text-gray-600 mt-2">Create composite signals, add noise, apply windows, and inspect time and frequency plots with export options.</p>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-xs text-gray-500">Interactive DSP playground</div>
                        <div className="inline-flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs">Open</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>

              {/* placeholders */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-gradient-to-tr from-emerald-500 to-lime-400 text-white">WD</div>
                  <div>
                    <h4 className="text-lg font-semibold">Waveform Designer</h4>
                    <p className="text-sm text-gray-600 mt-2">Design and export custom waveforms (coming soon).</p>
                  </div>
                </div>
                <div className="mt-4 text-xs text-gray-500">Soon</div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-gradient-to-tr from-rose-500 to-pink-400 text-white">SP</div>
                  <div>
                    <h4 className="text-lg font-semibold">Spectrum Lab</h4>
                    <p className="text-sm text-gray-600 mt-2">Advanced spectral analysis tools (coming soon).</p>
                  </div>
                </div>
                <div className="mt-4 text-xs text-gray-500">Soon</div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t bg-white/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-600 gap-3">
          <div>© {new Date().getFullYear()} cbmapps</div>
          <div>Built with Next.js & Tailwind • <span className="text-gray-500">No account required</span></div>
        </div>
      </footer>
    </div>
  );
}
