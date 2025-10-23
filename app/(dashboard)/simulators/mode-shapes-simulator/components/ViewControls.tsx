"use client";
import React from 'react';
import { useModeShapesStore } from '../hooks/useModeShapesStore';

export default function ViewControls() {
  const { view, setView } = useModeShapesStore();

  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm font-medium">View:</label>
      <button
        className={`px-3 py-1 text-sm rounded-md ${view === '3D' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        onClick={() => setView('3D')}
      >
        3D
      </button>
      <button
        className={`px-3 py-1 text-sm rounded-md ${view === 'line' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        onClick={() => setView('line')}
      >
        Line
      </button>
    </div>
  );
}
