'use client';
import React from 'react';
import type { AveragingMode } from '../hooks/useSpectrum';

export interface AveragingControlsProps {
  averagingMode: AveragingMode;
  setAveragingMode: (m: AveragingMode) => void;
  segmentLength: number;
  setSegmentLength: (n: number) => void;
  overlapPercent: number;
  setOverlapPercent: (v: number) => void;
  numAverages: number;
  setNumAverages: (n: number) => void;
}

const segmentOptions = [128, 256, 512, 1024, 2048];

export const AveragingControls: React.FC<AveragingControlsProps> = ({ averagingMode, setAveragingMode, segmentLength, setSegmentLength, overlapPercent, setOverlapPercent, numAverages, setNumAverages }) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Averaging</label>
      <select value={averagingMode} onChange={e => setAveragingMode(e.target.value as AveragingMode)} className="w-full rounded border p-2 bg-white text-gray-800">
        <option value="none">None (single FFT)</option>
        <option value="linear">Linear averaging</option>
        <option value="overlap">Overlap averaging</option>
      </select>

      {averagingMode !== 'none' && (
        <>
          <div>
            <label className="block text-sm font-medium">Number of averages</label>
            <input type="number" min={1} max={100} value={numAverages} onChange={e => setNumAverages(Math.max(1, Number(e.target.value) || 1))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" />
          </div>
          {/* For linear and overlap averaging the segment length is determined from LOR and Fmax */}
          {(averagingMode as AveragingMode) === 'none' && (
            <div>
              <label className="block text-sm font-medium">Segment length (samples)</label>
              <select value={segmentLength} onChange={e => setSegmentLength(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800">
                {segmentOptions.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          )}
          {/* Note: segment length is auto-derived for linear averaging (UI hidden) */}
          {averagingMode === 'overlap' && (
            <div>
              <label className="block text-sm font-medium">Overlap (%)</label>
              <input type="range" min={0} max={90} step={5} value={overlapPercent} onChange={e => setOverlapPercent(Number(e.target.value))} className="mt-2 w-full" />
              <div className="text-xs text-gray-600">{overlapPercent}%</div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
