"use client";
import { useState } from 'react';

const signalTypes = ['Sine', 'Square', 'Chirp', 'Noise'];
const windows = ['Hanning', 'Hamming', 'Rectangular', 'Blackman'];
const averagings = ['Linear', 'RMS', 'Exponential'];

interface ControlPanelProps {
  params: Record<string, number | string>;
  onChange: (params: Record<string, number | string>) => void;
}

export default function ControlPanel({ params, onChange }: ControlPanelProps) {
  const [local, setLocal] = useState<Record<string, number | string>>(params);

  const handleChange = (key: string, value: number | string) => {
    const updated: Record<string, number | string> = { ...local, [key]: value };
    setLocal(updated);
    onChange(updated);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block font-medium mb-1">Frequency (Hz)</label>
        <input type="range" min={1} max={100} value={local.frequency} onChange={e => handleChange('frequency', +e.target.value)} className="w-full" />
        <div>{local.frequency}</div>
      </div>
      <div>
        <label className="block font-medium mb-1">Amplitude</label>
        <input type="range" min={0} max={10} step={0.1} value={local.amplitude} onChange={e => handleChange('amplitude', +e.target.value)} className="w-full" />
        <div>{local.amplitude}</div>
      </div>
      <div>
        <label className="block font-medium mb-1">Phase (deg)</label>
        <input type="range" min={0} max={360} value={local.phase} onChange={e => handleChange('phase', +e.target.value)} className="w-full" />
        <div>{local.phase}</div>
      </div>
      <div>
        <label className="block font-medium mb-1">Noise Level</label>
        <input type="range" min={0} max={1} step={0.01} value={local.noise} onChange={e => handleChange('noise', +e.target.value)} className="w-full" />
        <div>{local.noise}</div>
      </div>
      <div>
        <label className="block font-medium mb-1">Sampling Frequency</label>
        <input type="range" min={10} max={1000} value={local.sampling} onChange={e => handleChange('sampling', +e.target.value)} className="w-full" />
        <div>{local.sampling}</div>
      </div>
      <div>
        <label className="block font-medium mb-1">Window</label>
        <select value={local.window} onChange={e => handleChange('window', e.target.value)} className="w-full p-2 rounded">
          {windows.map(w => <option key={w}>{w}</option>)}
        </select>
      </div>
      <div>
        <label className="block font-medium mb-1">Averaging</label>
        <select value={local.averaging} onChange={e => handleChange('averaging', e.target.value)} className="w-full p-2 rounded">
          {averagings.map(a => <option key={a}>{a}</option>)}
        </select>
      </div>
      <div>
        <label className="block font-medium mb-1">Signal Type</label>
        <select value={local.type} onChange={e => handleChange('type', e.target.value)} className="w-full p-2 rounded">
          {signalTypes.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
    </div>
  );
}
