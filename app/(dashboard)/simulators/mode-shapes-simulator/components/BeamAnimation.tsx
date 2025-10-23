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
    let prevTs: number | null = null;
    let theta = 0; // accumulated animation phase to ensure continuity
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const render = (ts: number) => {
      let dt = 0;
      if (prevTs === null) {
        dt = 0;
        prevTs = ts;
      } else {
        dt = Math.min(0.05, Math.max(0.0005, (ts - prevTs) / 1000));
        prevTs = ts;
      }

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
      const depth = 4 + 12 * Math.sqrt(s.stiffness / 10); // Scale depth with stiffness
      const strokeW = Math.max(5, Math.min(10, 4 + 2 * Math.sqrt(s.stiffness)));
      const view = s.view;

      // Frequency response at current forcing frequency for each mode
      const [fn1, fn2, fn3] = s.fn;
      const omegaF = 2 * Math.PI * s.forceFreqHz; // forcing frequency
      // Precompute FRF magnitudes and phases for all 3 modes
      let A1 = frfMagnitude(omegaF, 2 * Math.PI * fn1, s.zeta);
      let A2 = frfMagnitude(omegaF, 2 * Math.PI * fn2, s.zeta);
      let A3 = frfMagnitude(omegaF, 2 * Math.PI * fn3, s.zeta);
      const ph1 = s.phaseEnabled ? frfPhase(omegaF, 2 * Math.PI * fn1, s.zeta) : 0;
      const ph2 = s.phaseEnabled ? frfPhase(omegaF, 2 * Math.PI * fn2, s.zeta) : 0;
      const ph3 = s.phaseEnabled ? frfPhase(omegaF, 2 * Math.PI * fn3, s.zeta) : 0;

      // Smooth band envelope: ramp up inside 30% band, max at center, ramp down out of band
      function smoothstep(x: number) { return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); }
      function bandFade(f: number, fn: number) {
        const band = 0.3 * fn;
        const d = Math.abs(f - fn);
        if (d >= band) return 0;
        // Map d in [band, 0] to [0, 1] then smoothstep
        const t = 1 - d / band;
        return smoothstep(t);
      }
      const fade1 = bandFade(s.forceFreqHz, fn1);
      const fade2 = bandFade(s.forceFreqHz, fn2);
      const fade3 = bandFade(s.forceFreqHz, fn3);
      A1 *= fade1; A2 *= fade2; A3 *= fade3;

      // Animation playback frequency controlled by animRate; slow near 0, equals forcing near 1
      const K = 100; // large divisor for slow motion
      const playbackHz = Math.max(0.05, s.forceFreqHz * (s.animRate * (1 - 1 / K) + 1 / K));
      const omegaAnim = 2 * Math.PI * playbackHz;
      theta += omegaAnim * dt;

      // If a mode is selected, use that; otherwise blend nearby modes using the fade envelopes
      let activeMode: 1 | 2 | 3 | null = s.selectedMode;

      const scale = (beamX1 - beamX0) * BEAM_STYLE.deflectionScale / BEAM_LENGTH_M * (s.ampScale ?? 1) * 0.1;

      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < xArr.length; i++) {
        const xi = xArr[i];
        const sx = beamX0 + (beamX1 - beamX0) * (xi / BEAM_LENGTH_M);
        const y0 = beamY;

        let yDefl = 0;
        if (activeMode === 1) {
          yDefl = modesPhi.phi1[i] * (A1 * Math.sin(theta + ph1)) * scale;
        } else if (activeMode === 2) {
          yDefl = modesPhi.phi2[i] * (A2 * Math.sin(theta + ph2)) * scale;
        } else if (activeMode === 3) {
          yDefl = modesPhi.phi3[i] * (A3 * Math.sin(theta + ph3)) * scale;
        } else {
          // Blend by summing contributions with fades; phases per mode
          const y1 = modesPhi.phi1[i] * (A1 * Math.sin(theta + ph1));
          const y2 = modesPhi.phi2[i] * (A2 * Math.sin(theta + ph2));
          const y3 = modesPhi.phi3[i] * (A3 * Math.sin(theta + ph3));
          yDefl = (y1 + y2 + y3) * scale;
        }

        pts.push({ x: sx, y: y0 + yDefl });
      }

      if (view === '3D') {
        // Deformed 3D-like beam rendering
        const slantX = 12; // px, perspective slant right
        const slantY = 8;  // px, perspective slant up

        // Calculate vertices for the deformed beam's edges
        const frontTopLine = pts.map(p => ({ x: p.x, y: p.y - depth / 2 }));
        const frontBottomLine = pts.map(p => ({ x: p.x, y: p.y + depth / 2 }));
        const backTopLine = pts.map(p => ({ x: p.x + slantX, y: p.y - depth / 2 - slantY }));
        const backBottomLine = pts.map(p => ({ x: p.x + slantX, y: p.y + depth / 2 - slantY }));

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#374151'; // gray-700

        // Top Face
        ctx.fillStyle = '#9ca3af'; // gray-400
        ctx.beginPath();
        ctx.moveTo(frontTopLine[0].x, frontTopLine[0].y);
        frontTopLine.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(backTopLine[backTopLine.length - 1].x, backTopLine[backTopLine.length - 1].y);
        [...backTopLine].reverse().forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Front Face
        ctx.fillStyle = '#6b7280'; // gray-500
        ctx.beginPath();
        ctx.moveTo(frontTopLine[0].x, frontTopLine[0].y);
        frontTopLine.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(frontBottomLine[frontBottomLine.length - 1].x, frontBottomLine[frontBottomLine.length - 1].y);
        [...frontBottomLine].reverse().forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right End Cap
        ctx.fillStyle = '#4b5563'; // gray-600
        ctx.beginPath();
        const last = pts.length - 1;
        ctx.moveTo(frontTopLine[last].x, frontTopLine[last].y);
        ctx.lineTo(frontBottomLine[last].x, frontBottomLine[last].y);
        ctx.lineTo(backBottomLine[last].x, backBottomLine[last].y);
        ctx.lineTo(backTopLine[last].x, backTopLine[last].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (view === 'line') {
        // Single vibrating centerline, no nodes/antinodes, no envelopes
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      } else {
        // 'string' view: static mode shape with node/antinode markers and legend
        // choose mode: selectedMode or nearest to forcing frequency
        let modeN: 1 | 2 | 3 = s.selectedMode ?? (Math.abs(s.forceFreqHz - fn1) <= Math.abs(s.forceFreqHz - fn2) && Math.abs(s.forceFreqHz - fn1) <= Math.abs(s.forceFreqHz - fn3) ? 1 : (Math.abs(s.forceFreqHz - fn2) <= Math.abs(s.forceFreqHz - fn3) ? 2 : 3));
        const phiArr = modeN === 1 ? modesPhi.phi1 : modeN === 2 ? modesPhi.phi2 : modesPhi.phi3;
        const staticAmp = 0.6; // relative visualization amplitude
        const ptsStr: { x: number; y: number; phi: number; xi: number }[] = [];
        for (let i = 0; i < xArr.length; i++) {
          const xi = xArr[i];
          const sx = beamX0 + (beamX1 - beamX0) * (xi / BEAM_LENGTH_M);
          const phi = phiArr[i];
          const y = beamY + phi * staticAmp * ((beamX1 - beamX0) * BEAM_STYLE.deflectionScale / BEAM_LENGTH_M * (s.ampScale ?? 1) * 0.1);
          ptsStr.push({ x: sx, y, phi, xi });
        }
        // draw static centerline
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < ptsStr.length; i++) {
          const p = ptsStr[i];
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        // nodes: zero crossings of phi
        for (let i = 1; i < ptsStr.length; i++) {
          const p0 = ptsStr[i-1], p1 = ptsStr[i];
          if ((p0.phi === 0) || (p0.phi < 0 && p1.phi > 0) || (p0.phi > 0 && p1.phi < 0)) {
            // interpolate x of zero crossing
            const denom = (p1.phi - p0.phi);
            const t = denom !== 0 ? (-p0.phi) / denom : 0;
            const xz = p0.x + (p1.x - p0.x) * Math.max(0, Math.min(1, t));
            ctx.fillStyle = 'green';
            ctx.beginPath();
            ctx.arc(xz, beamY, 8, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
        // include boundary nodes
        if (s.boundary === 'simply-supported') {
          // both ends are nodes
          ctx.fillStyle = 'green';
          ctx.beginPath(); ctx.arc(ptsStr[0].x, beamY, 8, 0, 2 * Math.PI); ctx.fill();
          ctx.beginPath(); ctx.arc(ptsStr[ptsStr.length-1].x, beamY, 8, 0, 2 * Math.PI); ctx.fill();
        } else if (s.boundary === 'cantilever') {
          // fixed end is a node
          ctx.fillStyle = 'green';
          ctx.beginPath(); ctx.arc(ptsStr[0].x, beamY, 8, 0, 2 * Math.PI); ctx.fill();
        }
        // antinodes: local maxima in |phi|
        for (let i = 1; i < ptsStr.length - 1; i++) {
          const a = Math.abs(ptsStr[i-1].phi), b = Math.abs(ptsStr[i].phi), c = Math.abs(ptsStr[i+1].phi);
          if (b >= a && b >= c && (b > a || b > c)) {
            ctx.fillStyle = 'purple';
            ctx.beginPath();
            ctx.arc(ptsStr[i].x, ptsStr[i].y, 8, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
        // include endpoint antinode (e.g., free tip in cantilever)
        if (s.boundary === 'cantilever') {
          const last = ptsStr.length - 1;
          if (Math.abs(ptsStr[last].phi) >= Math.abs(ptsStr[last-1].phi)) {
            ctx.fillStyle = 'purple';
            ctx.beginPath();
            ctx.arc(ptsStr[last].x, ptsStr[last].y, 8, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
        // legend
        ctx.fillStyle = 'green';
        ctx.beginPath();
        ctx.arc(20, 20, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#334155';
        ctx.fillText('Node', 35, 25);
        ctx.fillStyle = 'purple';
        ctx.beginPath();
        ctx.arc(100, 20, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#334155';
        ctx.fillText('Antinode', 115, 25);
      }

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
