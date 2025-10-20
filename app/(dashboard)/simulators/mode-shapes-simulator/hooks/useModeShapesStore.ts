import { create } from 'zustand';
import { BoundaryCondition, DEFAULT_DAMPING, DEFAULT_FN1_HZ, DEFAULT_MAX_SWEEP_HZ, CANTILEVER_BETA_L } from '../lib/constants';

export interface SimulatorState {
  boundary: BoundaryCondition;
  zeta: number; // damping ratio (assumed equal across modes)
  fn: [number, number, number]; // natural frequencies (Hz) for first 3 modes (derived from stiffness/mass)
  running: boolean;
  autoSweep: boolean;
  freqHz: number; // animation frequency (Hz)
  maxFreqHz: number; // sweep upper bound
  phaseEnabled: boolean;

  // New: physical sliders
  stiffness: number; // relative stiffness factor (E*I)
  mass: number; // relative mass factor (rho*A)
  selectedMode: 1 | 2 | 3; // which pure mode to render in the animation

  setBoundary: (b: BoundaryCondition) => void;
  setZeta: (z: number) => void;
  setRunning: (r: boolean) => void;
  setAutoSweep: (v: boolean) => void;
  setFreqHz: (f: number) => void;
  setMaxFreqHz: (f: number) => void;
  setPhaseEnabled: (p: boolean) => void;

  setStiffness: (k: number) => void;
  setMass: (m: number) => void;
  setSelectedMode: (n: 1 | 2 | 3) => void;
  reset: () => void;
}

function computeFnTriplet(stiffness: number, mass: number, baseF1: number): [number, number, number] {
  const r2 = Math.pow(CANTILEVER_BETA_L[1] / CANTILEVER_BETA_L[0], 2);
  const r3 = Math.pow(CANTILEVER_BETA_L[2] / CANTILEVER_BETA_L[0], 2);
  const scale = Math.sqrt(Math.max(0.05, stiffness) / Math.max(0.05, mass));
  const f1 = baseF1 * scale;
  const f2 = f1 * r2;
  const f3 = f1 * r3;
  return [f1, f2, f3];
}

export const useModeShapesStore = create<SimulatorState>((set, get) => ({
  boundary: 'cantilever',
  zeta: DEFAULT_DAMPING,
  stiffness: 1,
  mass: 1,
  selectedMode: 1,
  fn: computeFnTriplet(1, 1, DEFAULT_FN1_HZ),
  running: true,
  autoSweep: false,
  freqHz: 0.8,
  maxFreqHz: DEFAULT_MAX_SWEEP_HZ,
  phaseEnabled: true,

  setBoundary: (b) => set({ boundary: b }),
  setZeta: (z) => set({ zeta: Math.max(0, Math.min(0.2, z)) }),
  setRunning: (r) => set({ running: r }),
  setAutoSweep: (v) => set({ autoSweep: v }),
  setFreqHz: (f) => set({ freqHz: Math.max(0, f) }),
  setMaxFreqHz: (f) => set({ maxFreqHz: Math.max(1, f) }),
  setPhaseEnabled: (p) => set({ phaseEnabled: p }),

  setStiffness: (k) => {
    const kk = Math.max(0.1, Math.min(10, k));
    const { mass } = get();
    set({ stiffness: kk, fn: computeFnTriplet(kk, mass, DEFAULT_FN1_HZ) });
  },
  setMass: (m) => {
    const mm = Math.max(0.1, Math.min(10, m));
    const { stiffness } = get();
    set({ mass: mm, fn: computeFnTriplet(stiffness, mm, DEFAULT_FN1_HZ) });
  },
  setSelectedMode: (n) => set({ selectedMode: n }),

  reset: () => set(() => ({
    boundary: 'cantilever',
    zeta: DEFAULT_DAMPING,
    stiffness: 1,
    mass: 1,
    selectedMode: 1,
    fn: computeFnTriplet(1, 1, DEFAULT_FN1_HZ),
    running: true,
    autoSweep: false,
    freqHz: 0.8,
    maxFreqHz: DEFAULT_MAX_SWEEP_HZ,
    phaseEnabled: true,
  })),
}));
