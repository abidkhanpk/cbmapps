'use client';
import React from 'react';
import type { WindowType } from '../lib/dsp';

export interface WindowingControlsProps {
  windowType: WindowType;
  setWindowType: (w: WindowType) => void;
  showWindowed?: boolean;
  setShowWindowed?: (v: boolean) => void;
}

export const WindowingControls: React.FC<WindowingControlsProps> = ({ windowType, setWindowType, showWindowed, setShowWindowed }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Window function</label>
      <select value={windowType} onChange={e => setWindowType(e.target.value as WindowType)} className="mt-1 w-full rounded border p-2 bg-white text-gray-800">
        <option value="rectangular">Rectangular</option>
        <option value="hanning">Hanning</option>
        <option value="hamming">Hamming</option>
        <option value="blackman">Blackman</option>
      </select>
      {typeof setShowWindowed === 'function' && (
        <label className="inline-flex items-center gap-2 mt-2 text-sm">
          <input type="checkbox" checked={!!showWindowed} onChange={e => setShowWindowed(e.target.checked)} />
          <span>Show windowed time waveform</span>
        </label>
      )}
    </div>
  );
};
