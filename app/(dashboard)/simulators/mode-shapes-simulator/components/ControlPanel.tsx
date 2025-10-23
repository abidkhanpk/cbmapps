"use client";
import React, { useEffect } from 'react';
import { useModeShapesStore } from '../hooks/useModeShapesStore';

export default function ControlPanel() {
  const { zeta, fn, running, autoSweep, forceFreqHz,
    stiffness, mass, selectedMode, xAxisMax, boundary, sweepRate,
    setZeta, setRunning, setAutoSweep, setForceFreqHz, reset,
    setStiffness, setMass, setSelectedMode, setBoundary, setSweepRate
  } = useModeShapesStore();

  // Auto-sweep loop (decoupled) using adjustable sweepRate
  useEffect(() => {
    if (!autoSweep) return;
    let raf = 0;
    let prev = performance.now();
    let f = useModeShapesStore.getState().forceFreqHz; // start from current value
    const step = (ts: number) => {
      const dt = Math.min(0.03, Math.max(0.001, (ts - prev) / 1000));
      prev = ts;
      const rate = useModeShapesStore.getState().sweepRate; // Hz per second
      f += rate * dt;
      const xmax = useModeShapesStore.getState().xAxisMax;
      if (f >= xmax) f = 0;
      setForceFreqHz(f);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [autoSweep, setForceFreqHz]);

  // Auto-unselect mode if forcing frequency moves outside 20% band of selected mode
  useEffect(() => {
    if (selectedMode == null) return;
    const f = forceFreqHz;
    const target = selectedMode === 1 ? fn[0] : selectedMode === 2 ? fn[1] : fn[2];
    const band = 0.2;
    const within = Math.abs(f - target) <= band * target;
    if (!within) setSelectedMode(null);
  }, [forceFreqHz, selectedMode, fn, setSelectedMode]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-5 space-y-4">
      <h2 className="text-base font-semibold">Controls</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Boundary Condition</label>
          <select className="form-select" value={boundary} onChange={e => setBoundary(e.target.value as any)}>
            <option value="cantilever">Cantilever</option>
            <option value="simply-supported">Simply Supported</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Forcing Frequency (Hz)</label>
          <input type="range" min={0} max={xAxisMax} step={0.1} value={forceFreqHz} onChange={e => setForceFreqHz(Number(e.target.value))} className="w-full" />
        </div>
        {autoSweep && (
          <div>
            <label className="block text-sm font-medium">Sweep Rate (Hz/s)</label>
            <input type="range" min={0.05} max={5} step={0.05} value={sweepRate} onChange={e => setSweepRate(Number(e.target.value))} className="w-full" />
            <div className="text-xs text-gray-600 mt-1">{sweepRate.toFixed(2)} Hz/s</div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium">Damping Ratio ζ</label>
          <input type="range" min={0} max={0.1} step={0.001} value={zeta} onChange={e => setZeta(Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium">Stiffness (E·I)</label>
          <input type="range" min={0.1} max={10} step={0.1} value={stiffness} onChange={e => setStiffness(Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium">Mass (ρ·A)</label>
          <input type="range" min={0.1} max={10} step={0.1} value={mass} onChange={e => setMass(Number(e.target.value))} className="w-full" />
        </div>
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium">Mode</label>
          <div className="flex flex-wrap gap-2">
            <button
              className={`btn ${selectedMode === 1 ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => {
                if (selectedMode !== 1) {
                  setSelectedMode(1);
                  setForceFreqHz(fn[0]);
                  setAutoSweep(false);
                } else {
                  setSelectedMode(null);
                }
              }}
            >First</button>
            <button
              className={`btn ${selectedMode === 2 ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => {
                if (selectedMode !== 2) {
                  setSelectedMode(2);
                  setForceFreqHz(fn[1]);
                  setAutoSweep(false);
                } else {
                  setSelectedMode(null);
                }
              }}
            >Second</button>
            <button
              className={`btn ${selectedMode === 3 ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => {
                if (selectedMode !== 3) {
                  setSelectedMode(3);
                  setForceFreqHz(fn[2]);
                  setAutoSweep(false);
                } else {
                  setSelectedMode(null);
                }
              }}
            >Third</button>
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
    </div>
  );
}
