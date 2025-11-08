import type {
  AnalysisSettings,
  HarmonicComponent,
  ImpactDescriptor,
  Sensor,
  SignalStats,
  SidebandDescriptor,
} from '../types'
import { rpmToHz } from './units'

type WindowName = AnalysisSettings['window']

const windowCache = new Map<string, Float32Array>()

export function mulberry32(seed: number) {
  return function rng() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function gaussianNoise(rng: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

export function computeStats(buffer: Float32Array): SignalStats {
  let sumSq = 0
  let max = -Infinity
  let min = Infinity
  for (let i = 0; i < buffer.length; i += 1) {
    const value = buffer[i]
    sumSq += value * value
    if (value > max) max = value
    if (value < min) min = value
  }
  const rms = Math.sqrt(sumSq / buffer.length)
  return { rms, peak: max, peakToPeak: max - min }
}

export function windowVector(length: number, name: WindowName): Float32Array {
  const key = `${name}-${length}`
  const cached = windowCache.get(key)
  if (cached) return cached

  const vector = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    const ratio = i / (length - 1)
    switch (name) {
      case 'hamming':
        vector[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * ratio)
        break
      case 'blackman':
        vector[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * ratio) + 0.08 * Math.cos(4 * Math.PI * ratio)
        break
      case 'hanning':
      default:
        vector[i] = 0.5 * (1 - Math.cos(2 * Math.PI * ratio))
        break
    }
  }

  windowCache.set(key, vector)
  return vector
}

export function applyWindow(buffer: Float32Array, name: WindowName): Float32Array {
  const vector = windowVector(buffer.length, name)
  const windowed = new Float32Array(buffer.length)
  for (let i = 0; i < buffer.length; i += 1) {
    windowed[i] = buffer[i] * vector[i]
  }
  return windowed
}

export function integrateToVelocity(samples: Float32Array, fs: number): Float32Array {
  const velocity = new Float32Array(samples.length)
  let acc = 0
  const dt = 1 / fs
  for (let i = 0; i < samples.length; i += 1) {
    acc += samples[i] * dt
    velocity[i] = acc
  }
  return velocity
}

export function decimateSeries(samples: Float32Array, maxPoints = 2048): Float32Array {
  if (samples.length <= maxPoints) return samples
  const stride = Math.ceil(samples.length / maxPoints)
  const decimated = new Float32Array(Math.floor(samples.length / stride))
  for (let i = 0, j = 0; i < samples.length; i += stride, j += 1) {
    decimated[j] = samples[i]
  }
  return decimated
}

export function composeHarmonics({
  order,
  rpm,
  amplitude,
  phaseDeg,
  t,
  randomPhase,
  sensorPhase = 0,
}: {
  order: number
  rpm: number
  amplitude: number
  phaseDeg: number
  t: number
  randomPhase?: number
  sensorPhase?: number
}): number {
  const basePhase = ((phaseDeg + sensorPhase + (randomPhase ?? 0)) * Math.PI) / 180
  const omega = 2 * Math.PI * order * rpmToHz(rpm)
  return amplitude * Math.sin(omega * t + basePhase)
}

export function resolveSensorPhase(sensor: Sensor): number {
  switch (sensor.location) {
    case 'DE':
      return 0
    case 'NDE':
      return 15
    case 'AX':
      return 90
    case 'BASE':
      return 180
    default:
      return 0
  }
}

export function synthesizeSeries({
  samples,
  fs,
  rpmProfile,
  harmonics,
  sidebands,
  impacts,
  sensor,
  noiseRms,
  rng,
}: {
  samples: number
  fs: number
  rpmProfile: Float32Array
  harmonics: HarmonicComponent[]
  sidebands?: SidebandDescriptor[]
  impacts?: ImpactDescriptor[]
  sensor: Sensor
  noiseRms: number
  rng: () => number
}): Float32Array {
  const buffer = new Float32Array(samples)
  const sensorPhase = resolveSensorPhase(sensor)

  for (let i = 0; i < samples; i += 1) {
    const t = i / fs
    const rpm = rpmProfile[i]
    let value = 0

    harmonics.forEach(component => {
      if (component.axis && component.axis !== sensor.axis && component.axis !== 'AX') {
        return
      }
      const randomPhase = component.randomPhase ? rng() * 360 : 0
      value += composeHarmonics({
        order: component.order,
        rpm,
        amplitude: component.amplitude,
        phaseDeg: component.phaseDeg,
        t,
        randomPhase,
        sensorPhase,
      })
    })

    sidebands?.forEach(sb => {
      if (sb.axis && sb.axis !== sensor.axis && sb.axis !== 'AX') return
      for (let k = -sb.count; k <= sb.count; k += 1) {
        if (k === 0) continue
        const order = sb.centerOrder + k * sb.spacingOrder
        value += composeHarmonics({
          order,
          rpm,
          amplitude: sb.amplitude / Math.abs(k),
          phaseDeg: 90 * Math.sign(k),
          t,
          randomPhase: rng() * 180,
          sensorPhase,
        })
      }
    })

    const broadband = gaussianNoise(rng) * noiseRms
    impacts?.forEach(impact => {
      if (impact.axis && impact.axis !== sensor.axis && impact.axis !== 'AX') return
      const phase = (t * impact.frequencyHz) % 1
      const envelope = Math.exp(-impact.bandwidthHz * phase)
      const carrier = Math.sin(2 * Math.PI * impact.frequencyHz * t + rng() * Math.PI)
      value += impact.amplitude * envelope * carrier
    })
    buffer[i] = value + broadband
  }

  return buffer
}

export function createRpmProfile({
  rpm,
  samples,
  fs,
  ramp,
}: {
  rpm: number
  samples: number
  fs: number
  ramp?: { enabled: boolean; from: number; to: number }
}): Float32Array {
  const profile = new Float32Array(samples)
  if (!ramp?.enabled) {
    profile.fill(rpm)
    return profile
  }
  const start = ramp.from ?? rpm
  const end = ramp.to ?? rpm
  for (let i = 0; i < samples; i += 1) {
    const progress = i / samples
    profile[i] = start + (end - start) * progress
  }
  return profile
}

export function normalizeSeries(series: Float32Array): Float32Array {
  const max = series.reduce((acc, v) => Math.max(acc, Math.abs(v)), 0)
  if (max === 0) return series
  const scaled = new Float32Array(series.length)
  for (let i = 0; i < series.length; i += 1) {
    scaled[i] = series[i] / max
  }
  return scaled
}
