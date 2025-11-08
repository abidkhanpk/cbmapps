# Rotating Machine Fault Simulator

This module implements an interactive rotating-machine vibration lab inside the Next.js dashboard. It combines a physically inspired three.js model, deterministic signal synthesis, worker-based FFT analytics, and Tailwind/shadcn-inspired controls.

## Highlights

- Fault presets for unbalance, misalignment, looseness, bearings (BPFO/BPFI/BSF/FTF), gears, belts, resonance, and cavitation.
- Deterministic signal synthesis (51.2 kHz default) executed in a dedicated Web Worker with seeded noise, harmonic/sideband models, and optional envelope demodulation.
- FFT worker with windowing, averaging, velocity conversion, and peak markers shared with Recharts-based plots.
- Fully interactive 3D machine (motor–coupling–rotor–bearings) with exaggeration, slow-motion playback, and animated phase arrows.
- CSV signal export and PNG chart snapshots for documentation or offline processing.
- Zustand-powered UI state, keyboard shortcuts, and accessibility-friendly controls (aria labels, focusable sliders/buttons).
- Vitest unit tests scoped to this module (`test:rotating-machine` script).

## File Map

All code lives under `app/(dashboard)/simulators/rotating-machine`:

- `page.tsx` — Server entry that defers to the client app and loads simulator styles.
- `client/RotatingMachineApp.tsx` — React client root orchestrating workers, tabs, exports, and layout.
- `components/*` — UI building blocks (controls, scene, charts, exports, playback).
- `lib/*` — Fault models, signal utilities, FFT/envelope helpers, bearing/gear calculators, unit helpers, phase math.
- `hooks/*` — Zustand store plus animation clock hook.
- `workers/*` — Web Worker entry points for synthesis and FFT.
- `styles/simulator.css` — Layout-specific styles layered atop Tailwind.
- `types.ts` — Shared TS contracts for machine/fault configs, worker payloads, and chart data.
- `__tests__/*` — Vitest suites covering bearings, FFT, and signal utilities.
- `README.md` — This document.

## Running Locally

```bash
pnpm install # or npm install
pnpm dev     # run Next.js dev server
```

The simulator route is available at `/simulators/rotating-machine`.

## Testing

```bash
npm run test:rotating-machine
```

This executes Vitest with jsdom, covering numerical helpers and FFT verification.

## Extending Faults & Sensors

- Add new fault recipes in `lib/faults.ts` (define harmonics, sidebands, impacts, badges, and animations).
- Update `faultPresets` metadata for UI copy.
- Sensors are configured in `hooks/useSimulatorStore.ts`. Each sensor needs an `id`, `location`, and axis; locations map to 3D positions in `MachineScene`.
- Workers exchange strongly typed payloads (see `types.ts`). When adding new analysis outputs, extend the worker payload types and update `RotatingMachineApp` to consume them.

## Accessibility & Shortcuts

- Space toggles play/pause, `[` / `]` adjust slow-mo, `-` / `=` adjust exaggeration.
- All controls are keyboard-focusable and expose descriptive ARIA labels.
- Charts provide high-contrast palettes; sensors have distinct colors consistent across charts and the 3D scene.

## Notes

- CSV exports include synchronized time columns for all active sensors at the configured sampling rate.
- PNG exports rely on `html-to-image` and capture the currently visible analytics tab (TWF/FFT/Phase/Polar).
- Web workers stream structured data back via transferable buffers to keep the main thread at 60 fps even with large sample sets.
