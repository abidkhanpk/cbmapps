export type FaultId =
  | 'unbalance'
  | 'misalignment'
  | 'soft_foot'
  | 'looseness'
  | 'bent_shaft'
  | 'eccentricity'
  | 'bearing_bpfo'
  | 'bearing_bpfi'
  | 'bearing_bsf'
  | 'bearing_ftf'
  | 'gear_mesh'
  | 'gear_chipped'
  | 'belt'
  | 'resonance'
  | 'cavitation'

export type SensorAxis = 'X' | 'Y' | 'Z'

export interface MachineConfig {
  rpm: number
  load: number
  units: 'mm/s' | 'in/s' | 'm/s2'
  ramp?: {
    enabled: boolean
    from: number
    to: number
  }
}

export interface Sensor {
  id: string
  location: 'DE' | 'NDE' | 'AX' | 'BASE'
  axis: SensorAxis
  label?: string
}

export interface FaultConfig {
  id: FaultId
  severity: number
  bearing?: BearingGeometry
  gear?: GearGeometry
  notes?: string
}

export interface BearingGeometry {
  rollers: number
  pitchDiameter_mm: number
  rollerDiameter_mm: number
  contactAngle_deg: number
}

export interface GearGeometry {
  teeth: number
  mateTeeth: number
}

export interface SynthesisParams {
  fs: number
  seconds: number
  seed: number
  noiseRms: number
  blockSize: number
  integrateToVelocity: boolean
}

export interface PlaybackSettings {
  playing: boolean
  slowmo: number
  exaggeration: number
  linkToAmplitude: boolean
  playhead: number
}

export interface AnalysisSettings {
  window: 'hanning' | 'hamming' | 'blackman'
  averages: number
  lines: number
  envelope: boolean
  orderTracking: boolean
  velocity: boolean
}

export interface SignalStats {
  rms: number
  peak: number
  peakToPeak: number
}

export interface FaultAnimationCue {
  mode: 'whirl' | 'wobble' | 'rock' | 'impact' | 'axial' | 'flutter'
  description: string
  highlight: string
  color: string
}

export interface MotionDescriptor {
  orbitMajor: number
  orbitMinor: number
  axial: number
  torsional: number
  phaseLag: number
  cue: FaultAnimationCue
  severity: number
}

export interface FaultMarker {
  id: string
  label: string
  frequencyHz: number
  severity: number
}

export interface SpectrumResult {
  f: Float32Array
  magnitude: Record<string, Float32Array>
  phase: Record<string, Float32Array>
  envelope?: Record<string, Float32Array>
  metadata: {
    window: AnalysisSettings['window']
    averages: number
  }
  markers?: FaultMarker[]
}

export interface SimulationResults {
  requestId: string
  time: Record<string, Float32Array>
  tach: Float32Array
  stats: Record<string, SignalStats>
  envelope?: Record<string, Float32Array>
  motion: MotionDescriptor
  generatedAt: number
  spectrum?: SpectrumResult
  markers?: FaultMarker[]
}

export interface HarmonicComponent {
  order: number
  amplitude: number
  phaseDeg: number
  axis?: SensorAxis | 'AX'
  randomPhase?: boolean
}

export interface SidebandDescriptor {
  centerOrder: number
  spacingOrder: number
  count: number
  amplitude: number
  axis?: SensorAxis | 'AX'
}

export interface ImpactDescriptor {
  frequencyHz: number
  amplitude: number
  randomness: number
  axis?: SensorAxis | 'AX'
  bandwidthHz: number
}

export interface FaultPlan {
  harmonics: HarmonicComponent[]
  sidebands?: SidebandDescriptor[]
  impacts?: ImpactDescriptor[]
  broadbandRms: number
  cue: FaultAnimationCue
  markers: FaultMarker[]
  axialBias?: number
  modulationDepth?: number
}

export interface FaultDescriptor {
  id: FaultId
  label: string
  description: string
  severityHint: string
  indicators: string[]
}

export interface WorkerSynthesisRequest {
  type: 'synthesize'
  requestId: string
  payload: {
    machine: MachineConfig
    sensors: Sensor[]
    fault: FaultConfig
    synthesis: SynthesisParams
    analysis: AnalysisSettings
    amplitudeScale: number
  }
}

export interface WorkerSynthesisResponse {
  type: 'synthesisResult'
  requestId: string
  payload: SimulationResults
}

export interface WorkerFFTRequest {
  type: 'fft'
  requestId: string
  payload: {
    time: Record<string, Float32Array>
    tach: Float32Array
    fs: number
    window: AnalysisSettings['window']
    averages: number
    blockSize: number
    envelope?: Record<string, Float32Array>
    velocity: boolean
  }
}

export interface WorkerFFTResponse {
  type: 'fftResult'
  requestId: string
  payload: SpectrumResult
}

export interface ExportPayload {
  time: Record<string, Float32Array>
  tach: Float32Array
  spectrum?: SpectrumResult
  fs: number
}
