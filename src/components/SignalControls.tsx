'use client';
import React from 'react';
import type { SignalType } from '@/hooks/useSignal';

export interface SignalControlsProps {
  signalType: SignalType;
  setSignalType: (v: SignalType) => void;
  amplitude: number;
  setAmplitude: (v: number) => void;
  frequency: number;
  setFrequency: (v: number) => void;
  phaseDeg: number;
  setPhaseDeg: (v: number) => void;
  fs: number;
  setFs: (v: number) => void;
  noiseLevel: number;
  setNoiseLevel: (v: number) => void;
  numSamples: number;
  setNumSamples: (v: number) => void;
  chirpStartFreq: number;
  setChirpStartFreq: (v: number) => void;
  chirpEndFreq: number;
  setChirpEndFreq: (v: number) => void;
}

const pow2Options = [256, 512, 1024, 2048, 4096];

export const SignalControls: React.FC<SignalControlsProps> = ({
  signalType, setSignalType,
  amplitude, setAmplitude,
  frequency, setFrequency,
  phaseDeg, setPhaseDeg,
  fs, setFs,
  noiseLevel, setNoiseLevel,
  numSamples, setNumSamples,
  chirpStartFreq, setChirpStartFreq,
  chirpEndFreq, setChirpEndFreq,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Signal Type</label>
        <select value={signalType} onChange={e => setSignalType(e.target.value as SignalType)} className="mt-1 w-full rounded border p-2 bg-white text-gray-800">
          <option value="sine">Sine</option>
          <option value="square">Square</option>
          <option value="chirp">Chirp (linear)</option>
          <option value="noise">Random noise</option>
        </select>
      </div>

      {signalType !== 'noise' && signalType !== 'chirp' && (
        <div>
          <label className="block text-sm font-medium">Frequency (Hz)</label>
          <input type="number" value={frequency} onChange={e => setFrequency(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" min={0} step={0.1} />
        </div>
      )}

      {signalType === 'chirp' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Chirp Start F0 (Hz)</label>
            <input type="number" value={chirpStartFreq} onChange={e => setChirpStartFreq(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" min={0} step={0.1} />
          </div>
          <div>
            <label className="block text-sm font-medium">Chirp End F1 (Hz)</label>
            <input type="number" value={chirpEndFreq} onChange={e => setChirpEndFreq(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" min={0} step={0.1} />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium">Amplitude</label>
        <input type="number" value={amplitude} onChange={e => setAmplitude(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" min={0} step={0.1} />
      </div>
      {signalType !== 'noise' && (
        <div>
          <label className="block text-sm font-medium">Phase (degrees)</label>
          <input type="number" value={phaseDeg} onChange={e => setPhaseDeg(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" step={1} />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium">Sampling frequency (Hz)</label>
        <input type="number" value={fs} onChange={e => setFs(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" min={1} step={1} />
      </div>
      <div>
        <label className="block text-sm font-medium">Noise level (0-1)</label>
        <input type="range" min={0} max={1} step={0.01} value={noiseLevel} onChange={e => setNoiseLevel(Number(e.target.value))} className="mt-2 w-full" />
        <div className="text-xs text-gray-600">{noiseLevel.toFixed(2)}</div>
      </div>
      <div>
        <label className="block text-sm font-medium">Samples (N)</label>
        <select value={numSamples} onChange={e => setNumSamples(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800">
          {pow2Options.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
