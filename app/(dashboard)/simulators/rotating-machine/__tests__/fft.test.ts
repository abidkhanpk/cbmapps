import { describe, expect, it } from 'vitest'

import { computeSpectrum } from '../lib/fft'

describe('FFT wrapper', () => {
  it('detects dominant frequency bin', () => {
    const fs = 2048
    const blockSize = 1024
    const samples = new Float32Array(blockSize)
    const freq = 100
    for (let i = 0; i < samples.length; i += 1) {
      samples[i] = Math.sin((2 * Math.PI * freq * i) / fs)
    }
    const spectrum = computeSpectrum({
      time: { sensor: samples },
      fs,
      window: 'hanning',
      blockSize,
      averages: 1,
      velocity: false,
    })
    const magnitudes = spectrum.magnitude.sensor
    let peakIndex = 0
    for (let i = 1; i < magnitudes.length; i += 1) {
      if (magnitudes[i] > magnitudes[peakIndex]) {
        peakIndex = i
      }
    }
    expect(Math.abs(spectrum.f[peakIndex] - freq)).toBeLessThanOrEqual(fs / blockSize)
  })
})
