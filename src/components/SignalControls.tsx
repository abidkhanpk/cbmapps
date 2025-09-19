'use client';
import React from 'react';
import type { SingleSignalParams, SignalType } from '@/hooks/useSignal';

export interface SignalControlsProps {
  signals: SingleSignalParams[];
  setSignals: (v: SingleSignalParams[]) => void;
  fs: number;
  setFs: (v: number) => void;
  noiseLevel: number;
  setNoiseLevel: (v: number) => void;
  numSamples: number;
  setNumSamples: (v: number) => void;
  // new spectrum controls
  lor?: number;
  setLor?: (v: number) => void;
  fmax?: number;
  setFmax?: (v: number) => void;
  pow2Options?: number[];
  lorOptions?: number[];
  windowType?: string;
}

const defaultPow2 = [256, 512, 1024, 2048, 4096];

export const SignalControls: React.FC<SignalControlsProps> = ({ signals, setSignals, fs, setFs, noiseLevel, setNoiseLevel, numSamples, setNumSamples, lor, setLor, fmax, setFmax, pow2Options, lorOptions, windowType }) => {
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
              </select>
            </div>
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
          </div>
        </div>
      ))}
      
      <div>
        <label className="block text-sm font-medium">Noise level (0-1)</label>
        <input type="range" min={0} max={1} step={0.01} value={noiseLevel} onChange={e => setNoiseLevel(Number(e.target.value))} className="mt-2 w-full" />
        <div className="text-xs text-gray-600">{noiseLevel.toFixed(2)}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium">Sampling frequency (Hz)</label>
          <input type="number" value={fs} onChange={e => setFs(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" min={1} step={1} />
        </div>
        <div>
          <label className="block text-sm font-medium">Fmax (Hz)</label>
          <input type="number" value={Math.round(fmax ?? (fs / 2.56))} onChange={e => setFmax && setFmax(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" min={1} step={1} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <label className="block text-sm font-medium">Samples (N)</label>
          <select value={numSamples} onChange={e => setNumSamples(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800">
            {(pow2Options ?? defaultPow2).map((n: number) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Lines (LOR)</label>
          <select value={lor ?? Math.round(numSamples / 2.56)} onChange={e => setLor && setLor(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800">
            {(lorOptions ?? (defaultPow2.map((n: number) => Math.round(n / 2.56)))).map((l: number) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-3">
        <div>
          <div className="text-[11px] text-gray-500">Delta F (df)</div>
          <div className="text-[13px] font-mono font-medium text-gray-800">{(() => {
            const L = lor ?? Math.round(numSamples / 2.56);
            const fm = fmax ?? (fs / 2.56);
            const mult = (windowType === 'hanning') ? 1.5 : 1.0;
            const df = fm / Math.max(1, L) * mult;
            return df.toFixed(6);
          })()}</div>
        </div>

        <div>
          <div className="text-[11px] text-gray-500">Time period T (s)</div>
          <div className="text-[13px] font-mono font-medium text-gray-800">{(() => {
            const L = lor ?? Math.round(numSamples / 2.56);
            const fm = fmax ?? (fs / 2.56);
            const T = L / Math.max(1e-12, fm);
            return T.toFixed(6);
          })()}</div>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500 col-span-2">{(() => {
        const map: Record<string, number> = {
          rectangular: 1.0,
          hanning: 1.5,
          hamming: 1.36,
          blackman: 1.73,
        };
        const name = (windowType ?? 'rectangular');
        const factor = map[name] ?? 1.0;
        const displayName = name.charAt(0).toUpperCase() + name.slice(1);
        if (factor === 1.0) return `Window: ${displayName} (factor ${factor.toFixed(2)}×) — no effective df increase.`;
        return `Window: ${displayName} (factor ${factor.toFixed(2)}×) — effective df scaled by ~${factor.toFixed(2)}×.`;
      })()}</div>
    </div>
  );
};
