// Beam vibration math utilities
// Mode shapes for a uniform Euler–Bernoulli beam under common boundary conditions
// For rendering purposes we use normalized mode shape functions and standard FRF formula.

import { BEAM_LENGTH_M, CANTILEVER_BETA_L } from './constants';

export type Mode = 1 | 2 | 3;

// Helper: compute cantilever beam mode shape at position x (0..L), normalized to unit tip value
// Phi_n(x) = cosh(beta x) - cos(beta x) - sigma_n * (sinh(beta x) - sin(beta x))
// where sigma_n = (cosh(beta L) + cos(beta L)) / (sinh(beta L) + sin(beta L))
export function cantileverModeShape(n: Mode, x: number, L = BEAM_LENGTH_M) {
  const betaL = CANTILEVER_BETA_L[n - 1];
  const beta = betaL / L;
  const c = Math.cosh(beta * x);
  const s = Math.sinh(beta * x);
  const co = Math.cos(beta * x);
  const si = Math.sin(beta * x);
  const cL = Math.cosh(beta * L);
  const sL = Math.sinh(beta * L);
  const coL = Math.cos(beta * L);
  const siL = Math.sin(beta * L);
  const sigma = (cL + coL) / (sL + siL);
  const phi = c - co - sigma * (s - si);
  const phiTip = cL - coL - sigma * (sL - siL);
  // Normalize to unit tip displacement; ensures correct node locations and relative amplitudes
  return phi / (phiTip || 1e-12);
}

// Overhung beam approximation: treat as cantilever for mode shapes but allow different boundary in future
export function overhungModeShape(n: Mode, x: number, L = BEAM_LENGTH_M) {
  // Placeholder: using same as cantilever for visualization consistency, can be extended
  return cantileverModeShape(n, x, L);
}

// Simply-supported (pinned-pinned) beam mode shapes for a uniform Euler–Bernoulli beam
// Φ_n(x) = sin(n π x / L); already normalized with max amplitude of 1
export function simplySupportedModeShape(n: Mode, x: number, L = BEAM_LENGTH_M) {
  return Math.sin((n * Math.PI * x) / L);
}

// Frequency response magnitude for SDOF-like modal response
// |H(ω)| = 1 / sqrt((1 - (ω/ωn)^2)^2 + (2 ζ (ω/ωn))^2)
export function frfMagnitude(omega: number, omegaN: number, zeta: number) {
  const r = omegaN > 0 ? omega / omegaN : 0;
  const denom = Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
  return 1 / Math.max(denom, 1e-9);
}

export function frfPhase(omega: number, omegaN: number, zeta: number) {
  const r = omegaN > 0 ? omega / omegaN : 0;
  const ph = Math.atan2(2 * zeta * r, 1 - r * r);
  return ph; // radians
}

export function makeLinspace(n: number, a = 0, b = BEAM_LENGTH_M) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = a + (b - a) * (i / (n - 1));
  return out as number[];
}

export function clamp(n: number, a: number, b: number) { return Math.min(b, Math.max(a, n)); }
