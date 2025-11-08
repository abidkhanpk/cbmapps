'use client'

import { create } from 'zustand'

import type {
  AnalysisSettings,
  FaultConfig,
  MachineConfig,
  PlaybackSettings,
  Sensor,
  SimulationResults,
  SynthesisParams,
} from '../types'
import type { FaultId } from '../types'

const shallowEqual = <T extends object>(a: T, b: T) => {
  const aRecord = a as Record<string, unknown>
  const bRecord = b as Record<string, unknown>
  const aKeys = Object.keys(aRecord)
  const bKeys = Object.keys(bRecord)
  if (aKeys.length !== bKeys.length) return false
  for (let i = 0; i < aKeys.length; i += 1) {
    const key = aKeys[i]
    if (!Object.is(aRecord[key], bRecord[key])) {
      return false
    }
  }
  return true
}

const defaultSensors: Sensor[] = [
  { id: 'sensor-de-x', location: 'DE', axis: 'X', label: 'DE Radial' },
  { id: 'sensor-nde-x', location: 'NDE', axis: 'X', label: 'NDE Radial' },
  { id: 'sensor-ax-z', location: 'AX', axis: 'Z', label: 'Axial' },
]

interface SimulatorState {
  machine: MachineConfig
  sensors: Sensor[]
  fault: FaultConfig
  synthesis: SynthesisParams
  playback: PlaybackSettings
  analysis: AnalysisSettings
  results?: SimulationResults
  busy: boolean
  setMachine: (update: Partial<MachineConfig>) => void
  setSensors: (sensors: Sensor[]) => void
  addSensor: (sensor: Sensor) => void
  removeSensor: (sensorId: string) => void
  setFault: (update: Partial<FaultConfig>) => void
  setFaultId: (id: FaultId) => void
  setSynthesis: (update: Partial<SynthesisParams>) => void
  setPlayback: (update: Partial<PlaybackSettings>) => void
  setAnalysis: (update: Partial<AnalysisSettings>) => void
  setResults: (results: SimulationResults | undefined) => void
  setBusy: (busy: boolean) => void
  reset: () => void
}

const defaultMachine: MachineConfig = {
  rpm: 1800,
  load: 0.75,
  units: 'mm/s',
  ramp: { enabled: false, from: 1200, to: 3600 },
}

const defaultFault: FaultConfig = {
  id: 'unbalance',
  severity: 0.4,
  bearing: { rollers: 8, pitchDiameter_mm: 100, rollerDiameter_mm: 12, contactAngle_deg: 15 },
  gear: { teeth: 32, mateTeeth: 60 },
}

const defaultSynthesis: SynthesisParams = {
  fs: 51200,
  seconds: 2,
  seed: 1337,
  noiseRms: 0.02,
  blockSize: 4096,
  integrateToVelocity: false,
}

const defaultPlayback: PlaybackSettings = {
  playing: true,
  slowmo: 0.7,
  exaggeration: 3,
  linkToAmplitude: false,
  playhead: 0,
}

const defaultAnalysis: AnalysisSettings = {
  window: 'hanning',
  averages: 4,
  lines: 800,
  envelope: true,
  orderTracking: false,
  velocity: false,
}

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  machine: defaultMachine,
  sensors: defaultSensors,
  fault: defaultFault,
  synthesis: defaultSynthesis,
  playback: defaultPlayback,
  analysis: defaultAnalysis,
  busy: false,
  setMachine: update =>
    set(state => {
      const next = { ...state.machine, ...update }
      if (shallowEqual(next, state.machine)) {
        return state
      }
      return { machine: next }
    }),
  setSensors: sensors => set({ sensors }),
  addSensor: sensor =>
    set(state => {
      if (state.sensors.length >= 4) return state
      return { sensors: [...state.sensors, sensor] }
    }),
  removeSensor: sensorId =>
    set(state => ({
      sensors: state.sensors.filter(sensor => sensor.id !== sensorId),
    })),
  setFault: update =>
    set(state => {
      const next = { ...state.fault, ...update }
      if (shallowEqual(next, state.fault)) {
        return state
      }
      return { fault: next }
    }),
  setFaultId: id => set(state => ({ fault: { ...state.fault, id } })),
  setSynthesis: update =>
    set(state => {
      const next = { ...state.synthesis, ...update }
      if (shallowEqual(next, state.synthesis)) {
        return state
      }
      return { synthesis: next }
    }),
  setPlayback: update =>
    set(state => {
      const next = { ...state.playback, ...update }
      if (shallowEqual(next, state.playback)) {
        return state
      }
      return { playback: next }
    }),
  setAnalysis: update =>
    set(state => {
      const next = { ...state.analysis, ...update }
      if (shallowEqual(next, state.analysis)) {
        return state
      }
      return { analysis: next }
    }),
  setResults: results =>
    set(state => {
      if (
        state.results &&
        results &&
        state.results.requestId === results.requestId &&
        state.results.generatedAt === results.generatedAt
      ) {
        return state
      }
      return { results }
    }),
  setBusy: busy => set({ busy }),
  reset: () =>
    set({
      machine: defaultMachine,
      sensors: defaultSensors,
      fault: defaultFault,
      synthesis: defaultSynthesis,
      playback: defaultPlayback,
      analysis: defaultAnalysis,
      results: undefined,
      busy: false,
    }),
}))
