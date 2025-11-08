import type {
  FaultConfig,
  FaultDescriptor,
  FaultId,
  FaultPlan,
  FaultMarker,
  MachineConfig,
  Sensor,
} from '../types'
import { calculateBearingFaults, ensureBearingGeometry, bearingFaultLabel } from './bearings'
import { gearMeshFrequency } from './gears'
import { rpmToHz } from './units'

interface FaultLibraryEntry extends FaultDescriptor {
  buildPlan: (input: { machine: MachineConfig; fault: FaultConfig; sensors: Sensor[] }) => FaultPlan
}

const BASE_AMPLITUDE = 9.81 // default 1 g

const faultLibrary: Record<FaultId, FaultLibraryEntry> = {
  unbalance: {
    id: 'unbalance',
    label: 'Unbalance',
    description: 'Mass distribution causes a centrifugal force at rotating speed.',
    severityHint: 'Strong 1× vibration, stable phase, circular orbits.',
    indicators: ['Dominant 1× peak', 'Phase steady within ±5°', 'High radial amplitude'],
    buildPlan: ({ machine, fault }) => {
      const order1 = {
        order: 1,
        amplitude: BASE_AMPLITUDE * fault.severity * 0.8,
        phaseDeg: 0,
      }
      const order2 = {
        order: 2,
        amplitude: BASE_AMPLITUDE * fault.severity * 0.12,
        phaseDeg: -35,
      }
      const baseFreq = rpmToHz(machine.rpm)
      return {
        harmonics: [order1, order2],
        broadbandRms: 0.08 * fault.severity,
        markers: [{ id: '1x', label: '1×', frequencyHz: baseFreq, severity: fault.severity }],
        cue: {
          mode: 'whirl',
          description: 'Rotor centreline traces a stable circle.',
          highlight: 'Radial whirl',
          color: '#0ea5e9',
        },
        modulationDepth: 0.05 * fault.severity,
      }
    },
  },
  misalignment: {
    id: 'misalignment',
    label: 'Misalignment',
    description: 'Coupling offset or angular misalignment excites 2× components and axial motion.',
    severityHint: 'Watch for 2× with axial emphasis.',
    indicators: ['Elevated 2×', 'Axial/Radial phase split', 'Coupling heating'],
    buildPlan: ({ machine, fault }) => {
      const freq1 = rpmToHz(machine.rpm)
      return {
        harmonics: [
          { order: 1, amplitude: BASE_AMPLITUDE * 0.4 * fault.severity, phaseDeg: 15 },
          { order: 2, amplitude: BASE_AMPLITUDE * 0.9 * fault.severity, phaseDeg: 80, axis: 'AX' },
          { order: 3, amplitude: BASE_AMPLITUDE * 0.2 * fault.severity, phaseDeg: 120 },
        ],
        broadbandRms: 0.1 * fault.severity,
        axialBias: 0.7,
        markers: [
          { id: '1x', label: '1×', frequencyHz: freq1, severity: fault.severity * 0.4 },
          { id: '2x', label: '2×', frequencyHz: 2 * freq1, severity: fault.severity },
        ],
        cue: {
          mode: 'wobble',
          description: 'Coupling tilts once per revolution.',
          highlight: 'Coupling wobble',
          color: '#f97316',
        },
      }
    },
  },
  soft_foot: {
    id: 'soft_foot',
    label: 'Soft Foot',
    description: 'Base distortion causing unstable phase and rich harmonics.',
    severityHint: 'Harmonics up to 6× with fluctuating phase.',
    indicators: ['Spectrum comb', 'Amplitude changes with load', 'High casing motion'],
    buildPlan: ({ machine, fault }) => {
      const harmonics = Array.from({ length: 6 }).map((_, idx) => ({
        order: idx + 1,
        amplitude: BASE_AMPLITUDE * fault.severity * (1 / (idx + 1)) * 0.3,
        phaseDeg: idx * 25,
        randomPhase: true,
      }))
      return {
        harmonics,
        broadbandRms: 0.15 * fault.severity,
        markers: harmonics.map((component, idx) => ({
          id: `${idx + 1}x`,
          label: `${idx + 1}×`,
          frequencyHz: (idx + 1) * rpmToHz(machine.rpm),
          severity: fault.severity * (1 / (idx + 1)),
        })),
        cue: {
          mode: 'rock',
          description: 'Machine frame rocks as one foot lifts.',
          highlight: 'Base rocking',
          color: '#eab308',
        },
      }
    },
  },
  looseness: {
    id: 'looseness',
    label: 'Mechanical Looseness',
    description: 'Loose bolts or worn fits causing impacts and subharmonics.',
    severityHint: 'High-order harmonics, random impacts, noisy phase.',
    indicators: ['1× plus integer harmonics', 'Broadband raise', 'Spatially varying phase'],
    buildPlan: ({ machine, fault }) => {
      const base = rpmToHz(machine.rpm)
      const harmonics = Array.from({ length: 8 }).map((_, idx) => ({
        order: idx + 1,
        amplitude: BASE_AMPLITUDE * fault.severity * (idx === 0 ? 0.6 : 0.3 / (idx + 1)),
        phaseDeg: idx * 35,
        randomPhase: true,
      }))
      return {
        harmonics,
        broadbandRms: 0.25 * fault.severity,
        markers: harmonics.slice(0, 5).map((component, idx) => ({
          id: `${idx + 1}x`,
          label: `${idx + 1}×`,
          frequencyHz: (idx + 1) * base,
          severity: fault.severity * (1 - idx * 0.15),
        })),
        impacts: [
          {
            frequencyHz: base / 2,
            amplitude: BASE_AMPLITUDE * fault.severity * 0.4,
            randomness: 0.4,
            axis: 'X',
            bandwidthHz: base,
          },
        ],
        cue: {
          mode: 'impact',
          description: 'Bearing housings rattle inside loose fits.',
          highlight: 'Housing chatter',
          color: '#ef4444',
        },
      }
    },
  },
  bent_shaft: {
    id: 'bent_shaft',
    label: 'Bent Shaft',
    description: 'Static bow introduces quadrature phase changes along the rotor.',
    severityHint: '1× with phase lag between bearings.',
    indicators: ['Phase split across bearings', 'High 1× radial', 'Orbit not centred'],
    buildPlan: ({ machine, fault }) => {
      const base = rpmToHz(machine.rpm)
      return {
        harmonics: [
          { order: 1, amplitude: BASE_AMPLITUDE * fault.severity * 0.7, phaseDeg: -25 },
          { order: 2, amplitude: BASE_AMPLITUDE * fault.severity * 0.18, phaseDeg: 60 },
        ],
        broadbandRms: 0.12 * fault.severity,
        markers: [{ id: '1x', label: '1×', frequencyHz: base, severity: fault.severity }],
        cue: {
          mode: 'whirl',
          description: 'Rotor bows causing elliptical whirl.',
          highlight: 'Bowed shaft',
          color: '#8b5cf6',
        },
      }
    },
  },
  eccentricity: {
    id: 'eccentricity',
    label: 'Eccentricity',
    description: 'Air-gap or mechanical eccentricity causing sidebands.',
    severityHint: '1× with RPM sidebands.',
    indicators: ['Sidebands around 1×', 'Load dependent amplitude', 'Current signature'],
    buildPlan: ({ machine, fault }) => {
      const base = rpmToHz(machine.rpm)
      return {
        harmonics: [{ order: 1, amplitude: BASE_AMPLITUDE * fault.severity * 0.7, phaseDeg: 0 }],
        sidebands: [
          { centerOrder: 1, spacingOrder: 1, count: 2, amplitude: BASE_AMPLITUDE * fault.severity * 0.2 },
        ],
        broadbandRms: 0.1 * fault.severity,
        markers: [
          { id: '1x', label: '1×', frequencyHz: base, severity: fault.severity },
          { id: 'sb+', label: 'SB+', frequencyHz: base + rpmToHz(machine.rpm), severity: fault.severity * 0.4 },
        ],
        cue: {
          mode: 'whirl',
          description: 'Offset rotor centreline with load modulation.',
          highlight: 'Off-centre rotor',
          color: '#0ea5e9',
        },
      }
    },
  },
  bearing_bpfo: bearingEntry('bearing_bpfo', 'Outer Race Fault', 'bpfo'),
  bearing_bpfi: bearingEntry('bearing_bpfi', 'Inner Race Fault', 'bpfi'),
  bearing_bsf: bearingEntry('bearing_bsf', 'Ball Spin Fault', 'bsf'),
  bearing_ftf: bearingEntry('bearing_ftf', 'Cage Fault', 'ftf'),
  gear_mesh: {
    id: 'gear_mesh',
    label: 'Gear Mesh',
    description: 'Healthy mesh plus mesh modulation sidebands.',
    severityHint: 'GMF lines with sidebands and harmonics.',
    indicators: ['GMF ± n×RPM', 'Tooth frequency multiples', 'Sidebands by load'],
    buildPlan: ({ machine, fault }) => {
      if (!fault.gear) {
        throw new Error('Gear geometry required for gear mesh faults.')
      }
      const gmf = gearMeshFrequency(machine, fault.gear)
      const shaftOrder = gmf / rpmToHz(machine.rpm)
      const harmonics = [
        { order: shaftOrder, amplitude: BASE_AMPLITUDE * 0.6 * fault.severity, phaseDeg: 0 },
        { order: 2 * shaftOrder, amplitude: BASE_AMPLITUDE * 0.3 * fault.severity, phaseDeg: 90 },
      ]
      const sidebands = [
        { centerOrder: shaftOrder, spacingOrder: 1, count: 3, amplitude: BASE_AMPLITUDE * 0.2 * fault.severity },
      ]
      return {
        harmonics,
        sidebands,
        broadbandRms: 0.15 * fault.severity,
        markers: [
          { id: 'gmf', label: 'GMF', frequencyHz: gmf, severity: fault.severity },
          { id: 'gmf2', label: '2×GMF', frequencyHz: 2 * gmf, severity: fault.severity * 0.6 },
        ],
        cue: {
          mode: 'impact',
          description: 'Gear teeth mesh with tooth-to-tooth modulation.',
          highlight: 'Mesh pulsation',
          color: '#f43f5e',
        },
      }
    },
  },
  gear_chipped: {
    id: 'gear_chipped',
    label: 'Gear Chipped Tooth',
    description: 'Broken tooth causes pronounced sidebands and modulation.',
    severityHint: 'GMF with strong lower sidebands and noise floor rise.',
    indicators: ['Sideband asymmetry', 'Time waveform impacts', 'Polarized load zone'],
    buildPlan: ({ machine, fault }) => {
      if (!fault.gear) {
        throw new Error('Gear geometry required for chipped tooth faults.')
      }
      const gmf = gearMeshFrequency(machine, fault.gear)
      const shaftOrder = gmf / rpmToHz(machine.rpm)
      return {
        harmonics: [{ order: shaftOrder, amplitude: BASE_AMPLITUDE * fault.severity, phaseDeg: 10 }],
        sidebands: [
          { centerOrder: shaftOrder, spacingOrder: 1, count: 4, amplitude: BASE_AMPLITUDE * 0.35 * fault.severity },
        ],
        broadbandRms: 0.2 * fault.severity,
        markers: [
          { id: 'gmf', label: 'GMF', frequencyHz: gmf, severity: fault.severity },
          { id: 'sb', label: 'Sideband', frequencyHz: gmf - rpmToHz(machine.rpm), severity: fault.severity * 0.6 },
        ],
        cue: {
          mode: 'impact',
          description: 'Chipped tooth causes periodic torque dips.',
          highlight: 'Tooth defect',
          color: '#fb7185',
        },
      }
    },
  },
  belt: {
    id: 'belt',
    label: 'Belt Defect',
    description: 'Belt pass frequency with flutter and modulation.',
    severityHint: 'BPF ±1× sidebands, higher noise.',
    indicators: ['Fluttering belt', 'Sheave wear', 'Speed dependent sidebands'],
    buildPlan: ({ machine, fault }) => {
      const beltPass = rpmToHz(machine.rpm) * 1.25
      return {
        harmonics: [
          { order: beltPass / rpmToHz(machine.rpm), amplitude: BASE_AMPLITUDE * 0.45 * fault.severity, phaseDeg: -20 },
        ],
        sidebands: [
          { centerOrder: beltPass / rpmToHz(machine.rpm), spacingOrder: 1, count: 2, amplitude: BASE_AMPLITUDE * 0.2 * fault.severity },
        ],
        broadbandRms: 0.12 * fault.severity,
        modulationDepth: 0.2 * fault.severity,
        markers: [{ id: 'bpf', label: 'BPF', frequencyHz: beltPass, severity: fault.severity }],
        cue: {
          mode: 'flutter',
          description: 'Belt tension oscillates, causing flutter.',
          highlight: 'Belt flutter',
          color: '#10b981',
        },
      }
    },
  },
  resonance: {
    id: 'resonance',
    label: 'Resonance',
    description: 'Excitation near a natural frequency with high Q response.',
    severityHint: 'Large amplitude near fn, phase shift 90–180°.',
    indicators: ['Amplitude spike near fn', 'Phase flip', 'High settling time'],
    buildPlan: ({ machine, fault }) => {
      const fn = rpmToHz(machine.rpm) * 3.2
      return {
        harmonics: [
          { order: fn / rpmToHz(machine.rpm), amplitude: BASE_AMPLITUDE * 1.2 * fault.severity, phaseDeg: 95 },
        ],
        broadbandRms: 0.18 * fault.severity,
        markers: [{ id: 'fn', label: 'Fn', frequencyHz: fn, severity: fault.severity }],
        cue: {
          mode: 'whirl',
          description: 'Mode shape amplifies response at resonance.',
          highlight: 'Mode amplification',
          color: '#14b8a6',
        },
      }
    },
  },
  cavitation: {
    id: 'cavitation',
    label: 'Cavitation',
    description: 'Vapor bubbles collapsing cause broadband bursts.',
    severityHint: 'Wideband noise, high-frequency spikes.',
    indicators: ['Rumbling sound', 'Random impacts', 'Higher kurtosis'],
    buildPlan: ({ machine, fault }) => {
      const base = rpmToHz(machine.rpm)
      return {
        harmonics: [{ order: 1, amplitude: BASE_AMPLITUDE * 0.2 * fault.severity, phaseDeg: 0 }],
        broadbandRms: 0.35 * fault.severity,
        impacts: [
          {
            frequencyHz: base * 5,
            amplitude: BASE_AMPLITUDE * 0.5 * fault.severity,
            randomness: 0.8,
            axis: 'AX',
            bandwidthHz: base * 4,
          },
        ],
        markers: [{ id: 'broadband', label: 'Broadband', frequencyHz: base * 5, severity: fault.severity * 0.6 }],
        cue: {
          mode: 'impact',
          description: 'Random bubble collapses at pump inlet.',
          highlight: 'Cavitation bursts',
          color: '#38bdf8',
        },
      }
    },
  },
}

function bearingEntry(id: FaultId, label: string, key: 'bpfo' | 'bpfi' | 'bsf' | 'ftf'): FaultLibraryEntry {
  return {
    id,
    label,
    description: `${label} identified via envelope analysis.`,
    severityHint: `${bearingFaultLabel(key)} in envelope spectrum with sidebands.`,
    indicators: ['High-frequency impacts', 'Envelope lines', 'Sideband spacing 1×RPM'],
    buildPlan: ({ machine, fault }) => {
      ensureBearingGeometry(fault.bearing)
      const freqs = calculateBearingFaults(machine, fault.bearing)
      const target = freqs[key]
      const order = target / rpmToHz(machine.rpm)
      return {
        harmonics: [{ order: 1, amplitude: BASE_AMPLITUDE * 0.12, phaseDeg: 0 }],
        impacts: [
          {
            frequencyHz: target,
            amplitude: BASE_AMPLITUDE * 0.6 * fault.severity,
            randomness: 0.25,
            axis: 'X',
            bandwidthHz: target * 0.3,
          },
        ],
        sidebands: [
          { centerOrder: order, spacingOrder: 1, count: 2, amplitude: BASE_AMPLITUDE * 0.25 * fault.severity, axis: 'X' },
        ],
        broadbandRms: 0.18 * fault.severity,
        markers: [{ id: key, label: bearingFaultLabel(key), frequencyHz: target, severity: fault.severity }],
        cue: {
          mode: 'impact',
          description: 'Rolling element defect produces repetitive impacts.',
          highlight: `${bearingFaultLabel(key)} marker`,
          color: '#f43f5e',
        },
      }
    },
  }
}

export function buildFaultPlan(input: { machine: MachineConfig; fault: FaultConfig; sensors: Sensor[] }): FaultPlan {
  const entry = faultLibrary[input.fault.id]
  if (!entry) {
    return {
      harmonics: [{ order: 1, amplitude: BASE_AMPLITUDE * 0.1, phaseDeg: 0 }],
      broadbandRms: 0.05,
      markers: [],
      cue: { mode: 'whirl', description: 'Nominal', highlight: 'Healthy', color: '#22c55e' },
    }
  }
  return entry.buildPlan(input)
}

export const faultPresets = Object.values(faultLibrary).map(item => ({
  id: item.id,
  label: item.label,
  description: item.description,
  severityHint: item.severityHint,
  indicators: item.indicators,
}))
