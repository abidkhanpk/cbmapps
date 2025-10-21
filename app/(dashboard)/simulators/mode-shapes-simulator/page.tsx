import React from 'react';
import BeamAnimation from './components/BeamAnimation';
import BodePlot from './components/BodePlot';
import ControlPanel from './components/ControlPanel';
import AnimationControlsBelow from './components/AnimationControlsBelow';

export const metadata = { title: 'Mode Shapes Simulator | Simulators' };

export default function ModeShapesSimulatorPage() {
  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col">
          <h1 className="h3 mb-0">Mode Shapes Simulator</h1>
          <p className="text-muted">Cantilever/Overhung beam mode shapes and frequency response</p>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-4 order-2 order-lg-1">
          <ControlPanel />
        </div>
        <div className="col-lg-8 order-1 order-lg-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-3">
            <h2 className="h6 mb-3">Beam Visualization</h2>
            <div style={{ minHeight: 280 }}> <BeamAnimation /> </div>
            <AnimationControlsBelow />
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <h2 className="h6 mb-3">Bode Plot</h2>
            <BodePlot />
          </div>
        </div>
      </div>
    </div>
  );
}
