"use client";
import React from 'react';
import { useModeShapesStore } from '../hooks/useModeShapesStore';

export default function AnimationControlsBelow() {
  const { animRate, setAnimRate, ampScale, setAmpScale, fn } = useModeShapesStore();
  const maxRealistic = Math.max(fn[0], fn[1], fn[2]);
  const playbackHz = Math.max(0.05, animRate * maxRealistic);
  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Animation rate (0 – 1)</label>
          <input type="range" min={0} max={1} step={0.01} value={animRate} onChange={e => setAnimRate(Number(e.target.value))} className="w-full" />
          <div className="text-xs text-gray-600 mt-1">rate={animRate.toFixed(2)} → playback ≈ {playbackHz.toFixed(2)} Hz</div>
        </div>
        <div>
          <label className="block text-sm font-medium">Amplitude amplification</label>
          <input type="range" min={0.05} max={1} step={0.01} value={ampScale} onChange={e => setAmpScale(Number(e.target.value))} className="w-full" />
          <div className="text-xs text-gray-600 mt-1">{(ampScale*100).toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
}
