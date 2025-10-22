"use client";
import React, { useEffect, useMemo, useRef } from 'react';
import { BEAM_LENGTH_M, BEAM_STYLE, NUM_POINTS } from '../lib/constants';
import { cantileverModeShape, frfMagnitude, frfPhase, makeLinspace, simplySupportedModeShape } from '../lib/beamMath';
import { useModeShapesStore } from '../hooks/useModeShapesStore';

// Lightweight Canvas 2D beam renderer with requestAnimationFrame loop.
// We avoid Three.js here to minimize bundle weight and keep rendering simple and fast.


export default function BeamAnimation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // No direct subscription here; we read the latest store state each frame via getState()

  const xArr = useMemo(() => makeLinspace(NUM_POINTS, 0, BEAM_LENGTH_M), []);

  // Precompute static mode shape arrays for speed; recompute when boundary changes
  const boundary = useModeShapesStore(s => s.boundary);
  const modesPhi = useMemo(() => {
    let shapeFn = cantileverModeShape;
    if (boundary === 'simply-supported') shapeFn = simplySupportedModeShape;
    // overhung removed; same as cantilever if reintroduced
    const phi1 = xArr.map(x => shapeFn(1, x));
    const phi2 = xArr.map(x => shapeFn(2, x));
    const phi3 = xArr.map(x => shapeFn(3, x));
    return { phi1, phi2, phi3 };
  }, [xArr, boundary]);

  useEffect(() => {
    let raf = 0;
    let t0: number | null = null;
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
      const beamX0 = pad;
      const beamX1 = width - pad;
      const beamY = Math.floor(height / 2);
      const s = useModeShapesStore.getState();
      const strokeW = Math.max(5, Math.min(10, 4 + 2 * Math.sqrt(s.stiffness)));

      // Frequency response at current forcing frequency for each mode
      const [fn1, fn2, fn3] = s.fn;
      const omegaF = 2 * Math.PI * s.forceFreqHz; // forcing frequency
      // Precompute FRF magnitudes and phases for all 3 modes
      const A1 = frfMagnitude(omegaF, 2 * Math.PI * fn1, s.zeta);
      const A2 = frfMagnitude(omegaF, 2 * Math.PI * fn2, s.zeta);
      const A3 = frfMagnitude(omegaF, 2 * Math.PI * fn3, s.zeta);
      const ph1 = s.phaseEnabled ? frfPhase(omegaF, 2 * Math.PI * fn1, s.zeta) : 0;
      const ph2 = s.phaseEnabled ? frfPhase(omegaF, 2 * Math.PI * fn2, s.zeta) : 0;
      const ph3 = s.phaseEnabled ? frfPhase(omegaF, 2 * Math.PI * fn3, s.zeta) : 0;

      // Animation playback frequency controlled by animRate; slow near 0, equals forcing near 1
      const K = 100; // large divisor for slow motion
      const playbackHz = Math.max(0.05, s.forceFreqHz * (s.animRate * (1 - 1 / K) + 1 / K));
      const omegaAnim = 2 * Math.PI * playbackHz;

      // Determine active mode: if not explicitly selected, use the mode with the largest FRF magnitude
      let activeMode: 1 | 2 | 3 | null = s.selectedMode;
      if (activeMode == null) {
        if (A1 >= A2 && A1 >= A3) activeMode = 1; else if (A2 >= A3) activeMode = 2; else activeMode = 3;
      }

      // Compose instantaneous displacement y(x,t) = Φ_n(x) * q_n(t); amplitude decays smoothly with FRF
      const scale = (beamX1 - beamX0) * BEAM_STYLE.deflectionScale / BEAM_LENGTH_M * (s.ampScale ?? 1) * 0.1;

      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < xArr.length; i++) {
        const xi = xArr[i];
        const sx = beamX0 + (beamX1 - beamX0) * (xi / BEAM_LENGTH_M);
        const y0 = beamY;

        let yDefl = 0;
        if (activeMode === 1) {
          yDefl = modesPhi.phi1[i] * (A1 * Math.sin(omegaAnim * t + ph1)) * scale;
        } else if (activeMode === 2) {
          yDefl = modesPhi.phi2[i] * (A2 * Math.sin(omegaAnim * t + ph2)) * scale;
        } else if (activeMode === 3) {
          yDefl = modesPhi.phi3[i] * (A3 * Math.sin(omegaAnim * t + ph3)) * scale;
        }

        pts.push({ x: sx, y: y0 + yDefl });
      }

      // Simple baseline beam and animated deflected shape
      // Baseline
      ctx.strokeStyle = 'rgba(59,130,246,0.20)';
      ctx.lineWidth = Math.max(4, strokeW - 2);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(beamX0, beamY);
      ctx.lineTo(beamX1, beamY);
      ctx.stroke();

      // Deflected shape as centerline
      ctx.strokeStyle = '#1f4fa7';
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      // Axis and labels (minimal)
      ctx.fillStyle = '#334155';
      ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`${s.forceFreqHz.toFixed(2)} Hz`, width - 10, 18);
      ctx.textAlign = 'left';

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [xArr, modesPhi]);

  return (
    <div className="w-100 h-100" style={{ minHeight: 260 }}>
      <canvas ref={canvasRef} className="w-100 h-100 rounded border border-gray-200 bg-white" />
    </div>
  );
}
