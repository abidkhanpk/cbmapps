'use client';
import React from 'react';
import type { SingleSignalParams, SignalType } from '../hooks/useSignal';

export interface SignalControlsProps {
  signals: SingleSignalParams[];
  setSignals: (v: SingleSignalParams[]) => void;
}

export const SignalControls: React.FC<SignalControlsProps> = ({ signals, setSignals }) => {
  // Add new signal
  const addSignal = () => {
    setSignals([...signals, {
      type: 'sine', amplitude: 1, frequency: 10, phaseDeg: 0
    }]);
  };
  // Remove signal by index
  const removeSignal = (idx: number) => {
    setSignals(signals.filter((_, i) => i !== idx));
  };
  // Update signal param
  const updateSignal = (idx: number, key: keyof SingleSignalParams, value: string | number | boolean) => {
    setSignals(signals.map((sig, i) => i === idx ? { ...sig, [key]: value } : sig));
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold">Signals</span>
        <button type="button" className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs" onClick={addSignal}>Add Signal</button>
      </div>
      {signals.map((sig, idx) => (
        <div key={idx} className="border rounded p-2 mb-2 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="font-medium">Signal {idx + 1}</span>
            {signals.length > 1 && (
              <button type="button" className="text-red-500 text-xs" onClick={() => removeSignal(idx)}>Remove</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="block text-xs">Type</label>
              <select value={sig.type} onChange={e => updateSignal(idx, 'type', e.target.value as SignalType)} className="w-full rounded border p-1">
                <option value="sine">Sine</option>
                <option value="square">Square</option>
                <option value="chirp">Chirp</option>
                <option value="noise">Noise</option>
                <option value="am">Amp. Modulation</option>
                <option value="fm">Freq. Modulation</option>
                <option value="machine">Machine (composite)</option>
              </select>
            </div>

            {sig.type === 'machine' && (
              <div>
                <label className="block text-xs">Machine preset</label>
                <select value={sig.machinePreset ?? 'default'} onChange={e => updateSignal(idx, 'machinePreset', e.target.value)} className="w-full rounded border p-1">
                  <option value="default">Default (harmonics + sidebands)</option>
                  <option value="bearing">Bearing-like (multiple tones)</option>
                  <option value="gear">Gear mesh (harmonic-rich)</option>
                </select>
              </div>
            )}
            {sig.type === 'machine' && (
              <div>
                <label className="block text-xs">Complexity</label>
                <input type="range" min={1} max={8} step={1} value={sig.machineComplexity ?? 3} onChange={e => updateSignal(idx, 'machineComplexity', Number(e.target.value))} className="w-full" />
                <div className="text-xs text-gray-600">{`Components: ${sig.machineComplexity ?? 3}`}</div>
              </div>
            )}
            <div>
              <label className="block text-xs">Amplitude</label>
              <input type="number" value={sig.amplitude} onChange={e => updateSignal(idx, 'amplitude', Number(e.target.value))} className="w-full rounded border p-1" min={0} step={0.1} />
            </div>
            {(sig.type !== 'noise' && sig.type !== 'chirp') && (
              <div>
                <label className="block text-xs">Frequency (Hz)</label>
                <input type="number" value={sig.frequency} onChange={e => updateSignal(idx, 'frequency', Number(e.target.value))} className="w-full rounded border p-1" min={0} step={0.1} />
              </div>
            )}
            {sig.type === 'chirp' && (
              <>
                <div>
                  <label className="block text-xs">Chirp Start F0 (Hz)</label>
                  <input type="number" value={sig.chirpStartFreq ?? 0} onChange={e => updateSignal(idx, 'chirpStartFreq', Number(e.target.value))} className="w-full rounded border p-1" min={0} step={0.1} />
                </div>
                <div>
                  <label className="block text-xs">Chirp End F1 (Hz)</label>
                  <input type="number" value={sig.chirpEndFreq ?? 0} onChange={e => updateSignal(idx, 'chirpEndFreq', Number(e.target.value))} className="w-full rounded border p-1" min={0} step={0.1} />
                </div>
              </>
            )}
            {sig.type !== 'noise' && (
              <div>
                <label className="block text-xs">Phase (deg)</label>
                <input type="number" value={sig.phaseDeg} onChange={e => updateSignal(idx, 'phaseDeg', Number(e.target.value))} className="w-full rounded border p-1" step={1} />
              </div>
            )}
            {sig.type === 'am' && (
              <>
                <div>
                  <label className="block text-xs">AM: modulation frequency fm (Hz)</label>
                  <input type="number" value={sig.modulationFrequency ?? 2} onChange={e => updateSignal(idx, 'modulationFrequency', Number(e.target.value))} className="w-full rounded border p-1" min={0} step={0.1} />
                </div>
                <div>
                  <label className="block text-xs">AM: modulation index m (0-1)</label>
                  <input type="number" value={sig.modulationIndex ?? 0.5} onChange={e => updateSignal(idx, 'modulationIndex', Number(e.target.value))} className="w-full rounded border p-1" min={0} max={1} step={0.01} />
                </div>
              </>
            )}
            {sig.type === 'fm' && (
              <>
                <div>
                  <label className="block text-xs">FM: modulation frequency fm (Hz)</label>
                  <input type="number" value={sig.modulationFrequency ?? 2} onChange={e => updateSignal(idx, 'modulationFrequency', Number(e.target.value))} className="w-full rounded border p-1" min={0} step={0.1} />
                </div>
                <div>
                  <label className="block text-xs">FM: frequency deviation Δf (Hz)</label>
                  <input type="number" value={sig.frequencyDeviation ?? 5} onChange={e => updateSignal(idx, 'frequencyDeviation', Number(e.target.value))} className="w-full rounded border p-1" min={0} step={0.1} />
                </div>
              </>
            )}
          </div>
        </div>
      ))}
      
      {/* Sampling/noise controls moved to the sidebar groups to save vertical space */}
    </div>
  );
};
