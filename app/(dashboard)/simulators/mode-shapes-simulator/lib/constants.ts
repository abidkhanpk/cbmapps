// Constants and default configuration for the Mode Shapes Simulator
// Using SI units where applicable

export const BEAM_LENGTH_M = 1.0; // 1 meter beam length for normalization
export const NUM_POINTS = 120; // discretization along the span for rendering
export const DEFAULT_DAMPING = 0.02; // small structural damping

// For a uniform cantilever beam, eigenvalues beta_n * L satisfy cosh(beta L) cos(beta L) = -1
// Roots (beta_n * L) for first 3 bending modes
export const CANTILEVER_BETA_L = [
  1.875104068711961, // n=1
  4.694091132974174, // n=2
  7.854757438237612, // n=3
];

// Frequency ratios follow (beta_n / beta_1)^2
const RATIO_2 = Math.pow(CANTILEVER_BETA_L[1] / CANTILEVER_BETA_L[0], 2); // ~6.27
const RATIO_3 = Math.pow(CANTILEVER_BETA_L[2] / CANTILEVER_BETA_L[0], 2); // ~17.5

// Choose a convenient base fn1 (Hz). Other modes derived using the ratios above
export const DEFAULT_FN1_HZ = 5; // user can adjust
export const DEFAULT_FN2_HZ = DEFAULT_FN1_HZ * RATIO_2;
export const DEFAULT_FN3_HZ = DEFAULT_FN1_HZ * RATIO_3;

export const DEFAULT_MAX_SWEEP_HZ = 120; // upper bound for sweep and plot

export const BEAM_STYLE = {
  thickness: 0.05, // visual thickness (m) for baseline rendering only
  deflectionScale: 0.12, // visual scaling factor (m of deflection rendered per unit response)
};

export type BoundaryCondition = 'cantilever' | 'overhung';
