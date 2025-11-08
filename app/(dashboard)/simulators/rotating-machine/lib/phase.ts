import type { SpectrumResult } from '../types'

export function normalizePhase(angleRad: number): number {
  const tau = 2 * Math.PI
  return ((angleRad % tau) + tau) % tau
}

export function relativePhase(a: number, b: number): number {
  return normalizePhase(b - a)
}

export function phaseLagFromTimeSeries(reference: Float32Array, target: Float32Array): number {
  const n = Math.min(reference.length, target.length)
  let inPhase = 0
  let quadrature = 0
  for (let i = 1; i < n; i += 1) {
    const ref = reference[i]
    const tgt = target[i]
    const tgt90 = target[i] - target[i - 1]
    inPhase += ref * tgt
    quadrature += ref * tgt90
  }
  return Math.atan2(quadrature, inPhase)
}

export function phaseAtFrequency(
  spectrum: SpectrumResult | undefined,
  sensorId: string,
  frequencyHz: number,
): number | undefined {
  if (!spectrum) return undefined
  const phases = spectrum.phase[sensorId]
  if (!phases) return undefined
  const { f } = spectrum
  let index = 0
  let minDelta = Number.POSITIVE_INFINITY
  for (let i = 0; i < f.length; i += 1) {
    const delta = Math.abs(frequencyHz - f[i])
    if (delta < minDelta) {
      minDelta = delta
      index = i
    }
  }
  return phases[index]
}
