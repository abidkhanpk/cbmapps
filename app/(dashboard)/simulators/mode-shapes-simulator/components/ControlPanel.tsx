"use client";
import React, { useEffect } from 'react';
import { useModeShapesStore } from '../hooks/useModeShapesStore';

export default function ControlPanel() {
  const {
    boundary, zeta, fn, running, autoSweep, freqHz, maxFreqHz,
    stiffness, mass, selectedMode,
    setBoundary, setZeta, setRunning, setAutoSweep, setFreqHz, setMaxFreqHz, reset,
    setStiffness, setMass, setSelectedMode
  } = useModeShapesStore();

  // Auto-sweep loop
  useEffect(() => {
    if (!autoSweep) return;
    let raf = 0; let prev = performance.now();
    const step = (ts: number) => {
      const dt = Math.min(0.03, Math.max(0.001, (ts - prev) / 1000));
      prev = ts;
      const rate = 0.5; // Hz per second
      const f = freqHz + rate * dt;
      const next = f >= maxFreqHz ? 0 : f;
      setFreqHz(next);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [autoSweep, freqHz, maxFreqHz, setFreqHz]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-5 space-y-4">
      <h2 className="text-base font-semibold">Controls</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Max Frequency (Hz)</label>
          <input type="range" min={10} max={240} step={1} value={maxFreqHz} onChange={e => setMaxFreqHz(Number(e.target.value))} className="w-full" />
          <div className="text-xs text-gray-600 mt-1">{maxFreqHz.toFixed(0)} Hz</div>
        </div>
        <div>
          <label className="block text-sm font-medium">Animation Frequency (Hz)</label>
          <input type="range" min={0} max={maxFreqHz} step={0.1} value={freqHz} onChange={e => setFreqHz(Number(e.target.value))} className="w-full" />
          <div className="text-xs text-gray-600 mt-1">{freqHz.toFixed(2)} Hz</div>
        </div>
        <div>
          <label className="block text-sm font-medium">Damping Ratio ζ</label>
          <input type="range" min={0} max={0.1} step={0.001} value={zeta} onChange={e => setZeta(Number(e.target.value))} className="w-full" />
          <div className="text-xs text-gray-600 mt-1">{zeta.toFixed(3)}</div>
        </div>
        <div>
          <label className="block text-sm font-medium">Stiffness (E·I)</label>
          <input type="range" min={0.1} max={10} step={0.1} value={stiffness} onChange={e => setStiffness(Number(e.target.value))} className="w-full" />
          <div className="text-xs text-gray-600 mt-1">{stiffness.toFixed(1)}×</div>
        </div>
        <div>
          <label className="block text-sm font-medium">Mass (ρ·A)</label>
          <input type="range" min={0.1} max={10} step={0.1} value={mass} onChange={e => setMass(Number(e.target.value))} className="w-full" />
          <div className="text-xs text-gray-600 mt-1">{mass.toFixed(1)}×</div>
        </div>
        <div>
          <label className="block text-sm font-medium">Mode</label>
          <div className="flex gap-2">
            <button className={`btn ${selectedMode === 1 ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setSelectedMode(1)}>First</button>
            <button className={`btn ${selectedMode === 2 ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setSelectedMode(2)}>Second</button>
            <button className={`btn ${selectedMode === 3 ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setSelectedMode(3)}>Third</button>
          </div>
        </div>
        <div className="col-span-1 md:col-span-2 text-xs text-gray-600">
          f1 ≈ {fn[0].toFixed(2)} Hz, f2 ≈ {fn[1].toFixed(2)} Hz, f3 ≈ {fn[2].toFixed(2)} Hz
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className={`btn ${running ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setRunning(!running)}>{running ? 'Pause' : 'Run'}</button>
        <button className={`btn ${autoSweep ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setAutoSweep(!autoSweep)}>{autoSweep ? 'Stop Sweep' : 'Start Sweep'}</button>
        <button className="btn btn-outline-secondary" onClick={() => reset()}>Reset</button>
      </div>
      <div className="text-xs text-gray-600">Boundary: {boundary === 'cantilever' ? 'Cantilever' : 'Overhung'} (cantilever mode shapes used)</div>
    </div>
  );
}
