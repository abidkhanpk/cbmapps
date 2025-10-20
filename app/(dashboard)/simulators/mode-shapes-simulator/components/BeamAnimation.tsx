"use client";
import React, { useEffect, useMemo, useRef } from 'react';
import { BEAM_LENGTH_M, BEAM_STYLE, NUM_POINTS } from '../lib/constants';
import { cantileverModeShape, overhungModeShape, frfMagnitude, frfPhase, makeLinspace } from '../lib/beamMath';
import { useModeShapesStore } from '../hooks/useModeShapesStore';

// Lightweight Canvas 2D beam renderer with requestAnimationFrame loop.
// We avoid Three.js here to minimize bundle weight and keep rendering simple and fast.

function composeModeShape(boundary: 'cantilever' | 'overhung', x: number, modes: [number, number, number]) {
  const phi1 = boundary === 'cantilever' ? cantileverModeShape(1, x, BEAM_LENGTH_M) : overhungModeShape(1, x, BEAM_LENGTH_M);
  const phi2 = boundary === 'cantilever' ? cantileverModeShape(2, x, BEAM_LENGTH_M) : overhungModeShape(2, x, BEAM_LENGTH_M);
  const phi3 = boundary === 'cantilever' ? cantileverModeShape(3, x, BEAM_LENGTH_M) : overhungModeShape(3, x, BEAM_LENGTH_M);
  return [phi1, phi2, phi3] as const;
}

export default function BeamAnimation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const state = useModeShapesStore();

  const xArr = useMemo(() => makeLinspace(NUM_POINTS, 0, BEAM_LENGTH_M), []);

  // Precompute static mode shape arrays for speed
  const modesPhi = useMemo(() => {
    const phi1 = xArr.map(x => cantileverModeShape(1, x));
    const phi2 = xArr.map(x => cantileverModeShape(2, x));
    const phi3 = xArr.map(x => cantileverModeShape(3, x));
    return { phi1, phi2, phi3 };
  }, [xArr]);

  useEffect(() => {
    let raf = 0;
    let t0: number | null = null;
    let initOffset: number | null = null;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const render = (ts: number) => {
      if (t0 === null) t0 = ts;
      const t = (ts - t0) / 1000;

      // Resize to parent while keeping crisp lines
      const c = canvasRef.current!;
      const parent = c.parentElement!;
      const width = Math.floor(parent.clientWidth);
      const height = Math.max(240, Math.floor(parent.clientHeight));
      if (c.width !== Math.floor(width * dpr) || c.height !== Math.floor(height * dpr)) {
        c.width = Math.floor(width * dpr);
        c.height = Math.floor(height * dpr);
        c.style.width = width + 'px';
        c.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Clear
      ctx.clearRect(0, 0, width, height);

      // Drawing area
      const pad = 20;
      const beamX0 = pad + 30; // leave space for clamp hatch
      const beamX1 = width - pad;
      const beamY = Math.floor(height / 2);
      const strokeW = Math.max(5, Math.min(10, 4 + 2 * Math.sqrt(state.stiffness)));

      // Frequency response at current forcing frequency for each mode
      const [fn1, fn2, fn3] = state.fn;
      const om = 2 * Math.PI * state.freqHz;
      const A1 = frfMagnitude(om, 2 * Math.PI * fn1, state.zeta);
      const A2 = frfMagnitude(om, 2 * Math.PI * fn2, state.zeta);
      const A3 = frfMagnitude(om, 2 * Math.PI * fn3, state.zeta);
      const ph1 = state.phaseEnabled ? frfPhase(om, 2 * Math.PI * fn1, state.zeta) : 0;
      const ph2 = state.phaseEnabled ? frfPhase(om, 2 * Math.PI * fn2, state.zeta) : 0;
      const ph3 = state.phaseEnabled ? frfPhase(om, 2 * Math.PI * fn3, state.zeta) : 0;

      // Select a single pure mode based on UI
      const sel = state.selectedMode || 1;
      const A_sel = sel === 1 ? A1 : sel === 2 ? A2 : A3;
      const ph_sel = sel === 1 ? ph1 : sel === 2 ? ph2 : ph3;
      const phi_arr = sel === 1 ? modesPhi.phi1 : sel === 2 ? modesPhi.phi2 : modesPhi.phi3;

      // Initialize offset so initial deflection is zero (no drop at start)
      if (initOffset == null) {
        initOffset = Math.sin(ph_sel);
      }

      // Compose instantaneous displacement y(x,t) = Σ Φ_n(x) * q_n(t)
      // q_n(t) ~ A_n * sin(ω t + φ_n)
      const scale = (beamX1 - beamX0) * BEAM_STYLE.deflectionScale / BEAM_LENGTH_M;

      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < xArr.length; i++) {
        const xi = xArr[i];
        const sx = beamX0 + (beamX1 - beamX0) * (xi / BEAM_LENGTH_M);
        const y0 = beamY;
        const yDefl = (phi_arr[i] * (A_sel * (Math.sin(om * t + ph_sel) - (initOffset ?? 0)))) * scale;
        pts.push({ x: sx, y: y0 + yDefl });
      }

      // Draw baseline beam (light stroke)
      ctx.strokeStyle = 'rgba(59,130,246,0.20)';
      ctx.lineWidth = Math.max(4, strokeW - 2);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(beamX0, beamY);
      ctx.lineTo(beamX1, beamY);
      ctx.stroke();

      // Draw deflected shape as a stroked centerline
      ctx.strokeStyle = '#1f4fa7';
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      // Draw a hatched clamp at the left end to represent cantilever boundary
      const clampW = 24; const clampH = Math.max(32, strokeW * 3);
      const clampX = beamX0 - clampW - 6; const clampY = beamY - clampH / 2;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(clampX, clampY, clampW, clampH);
      // Hatch lines
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      for (let y = clampY - 10; y < clampY + clampH + 10; y += 10) {
        ctx.beginPath();
        ctx.moveTo(clampX - 6, y);
        ctx.lineTo(clampX + clampW + 6, y + 16);
        ctx.stroke();
      }

      // Tip marker removed to match reference image

      // Axis and labels (minimal)
      ctx.fillStyle = '#334155';
      ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.fillText(`f = ${state.freqHz.toFixed(2)} Hz`, width - 120, 22);

      if (state.running) raf = requestAnimationFrame(render); else raf = requestAnimationFrame(render); // keep rendering to allow slider updates
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [xArr, modesPhi, state]);

  return (
    <div className="w-100 h-100" style={{ minHeight: 260 }}>
      <canvas ref={canvasRef} className="w-100 h-100 rounded border border-gray-200 bg-white" />
    </div>
  );
}
