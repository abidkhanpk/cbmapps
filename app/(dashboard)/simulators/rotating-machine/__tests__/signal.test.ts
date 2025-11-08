import { describe, expect, it } from 'vitest'

import { computeStats, mulberry32, synthesizeSeries, createRpmProfile } from '../lib/signal'
import type { HarmonicComponent, Sensor } from '../types'

describe('signal utilities', () => {
  it('mulberry32 produces deterministic output', () => {
    const rngA = mulberry32(42)
    const rngB = mulberry32(42)
    const sequenceA = Array.from({ length: 5 }, () => rngA())
    const sequenceB = Array.from({ length: 5 }, () => rngB())
    expect(sequenceA).toEqual(sequenceB)
  })

  it('computeStats calculates RMS and peaks', () => {
    const data = new Float32Array([1, -1, 1, -1])
    const stats = computeStats(data)
    expect(stats.rms).toBeCloseTo(1, 5)
    expect(stats.peak).toBeCloseTo(1, 5)
    expect(stats.peakToPeak).toBeCloseTo(2, 5)
  })

  it('synthesizeSeries responds to harmonic definitions', () => {
    const harmonics: HarmonicComponent[] = [{ order: 1, amplitude: 1, phaseDeg: 0 }]
    const rpmProfile = createRpmProfile({ rpm: 600, samples: 1024, fs: 1024 })
    const sensor: Sensor = { id: 'test', location: 'DE', axis: 'X' }
    const result = synthesizeSeries({
      samples: 1024,
      fs: 1024,
      rpmProfile,
      harmonics,
      sensor,
      noiseRms: 0,
      rng: mulberry32(1),
    })
    expect(result.some(value => Math.abs(value) > 0.9)).toBe(true)
  })
})
