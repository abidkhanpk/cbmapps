# Mode Shapes Simulator

This simulator visualizes the mode shapes and frequency response of a uniform beam under harmonic excitation for multiple boundary conditions (cantilever, simply-supported, overhung).

## Theory

For a uniform Euler–Bernoulli cantilever beam, mode shapes Φ_n(x) are given by:

Φ_n(x) = cosh(β_n x) − cos(β_n x) − σ_n [sinh(β_n x) − sin(β_n x)]

where β_n L are roots of cosh(β L) cos(β L) = −1 and σ_n = (cosh βL + cos βL)/(sinh βL + sin βL).

For a simply-supported (pinned-pinned) beam, mode shapes are:

Φ_n(x) = sin(n π x / L)

The total displacement is approximated by modal superposition (first three modes):

y(x, t) ≈ Σ Φ_n(x) q_n(t), with q_n(t) ≈ |H_n(ω)| sin(ω t + φ_n)

Each modal frequency response is modeled by the standard SDOF transfer function:

|H_n(ω)| = 1 / sqrt((1 − (ω/ω_n)^2)^2 + (2 ζ (ω/ω_n))^2)

with small damping ζ (default 0.02). The phase φ_n = atan2(2 ζ r, 1 − r^2).

## Features

- Animated beam showing instantaneous deflection as forcing frequency sweeps
- First three bending mode shapes included
- Bode plot (amplitude and phase) derived by summing modal contributions
- Controls: frequency sweep, damping, natural frequencies, run/pause/reset
- Optional auto-sweep that loops frequency from 0 to max

## Tech Stack

- Next.js App Router, React, TypeScript
- Canvas 2D for real-time beam animation (fast and light)
- react-plotly.js for Bode plots
- zustand for simulator state management

## Files

- components/BeamAnimation.tsx — Canvas renderer for beam
- components/BodePlot.tsx — Amplitude/phase plots
- components/ControlPanel.tsx — User controls
- lib/constants.ts — Defaults and beam constants
- lib/beamMath.ts — Mode shape and FRF math

## Notes

- Simply-supported boundary option added with exact sin(nπx/L) mode shapes and frequency ratios 1:4:9.
- Overhung boundary is currently visualized using cantilever mode shapes (can be extended with proper boundary conditions).
- The Bode amplitude uses a simple sum of the three modal magnitudes for demonstration; more accurate models would include modal participation factors and normalization to physical units.

## Usage

Navigate to Simulators > Mode Shapes Demo, adjust controls, start/stop sweep, and observe beam response and Bode plots. 