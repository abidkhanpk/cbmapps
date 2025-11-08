import FFT from 'fft.js'

import type { SpectrumResult } from '../types'
import { applyWindow } from './signal'

interface FFTOptions {
  time: Record<string, Float32Array>
  fs: number
  window: 'hanning' | 'hamming' | 'blackman'
  blockSize: number
  averages: number
  velocity: boolean
  envelope?: Record<string, Float32Array>
}

export function computeSpectrum(options: FFTOptions): SpectrumResult {
  const { time, fs, window, blockSize, averages, velocity, envelope } = options
  const half = Math.floor(blockSize / 2)
  const frequencyAxis = new Float32Array(half)
  for (let i = 0; i < half; i += 1) {
    frequencyAxis[i] = (i * fs) / blockSize
  }

  const magnitude: Record<string, Float32Array> = {}
  const phase: Record<string, Float32Array> = {}
  const envelopeSpectra: Record<string, Float32Array> = {}

  Object.entries(time).forEach(([sensorId, buffer]) => {
    magnitude[sensorId] = averageSpectrum(buffer, { fs, window, blockSize, averages, velocity })
    phase[sensorId] = averagePhase(buffer, { fs, window, blockSize, averages })
  })

  if (envelope) {
    Object.entries(envelope).forEach(([sensorId, buffer]) => {
      envelopeSpectra[sensorId] = averageSpectrum(buffer, { fs, window, blockSize, averages, velocity: false })
    })
  }

  return {
    f: frequencyAxis,
    magnitude,
    phase,
    envelope: Object.keys(envelopeSpectra).length ? envelopeSpectra : undefined,
    metadata: { window, averages },
  }
}

interface AverageOptions {
  fs: number
  window: 'hanning' | 'hamming' | 'blackman'
  blockSize: number
  averages: number
  velocity?: boolean
}

function averageSpectrum(buffer: Float32Array, opts: AverageOptions): Float32Array {
  const { fs, window, blockSize, averages, velocity } = opts
  const fft = new FFT(blockSize)
  const tmp = fft.createComplexArray()
  const result = new Float32Array(Math.floor(blockSize / 2))
  const segment = new Float32Array(blockSize)
  const coherentGain = getCoherentGain(window)
  const windowCorrection = coherentGain > 0 ? 1 / coherentGain : 1

  for (let avg = 0; avg < averages; avg += 1) {
    const offset = avg * blockSize
    if (offset + blockSize > buffer.length) break
    segment.set(buffer.slice(offset, offset + blockSize))
    const windowed = applyWindow(segment, window)
    fft.realTransform(tmp, windowed)
    fft.completeSpectrum(tmp)

    for (let bin = 0; bin < result.length; bin += 1) {
      const re = tmp[bin * 2]
      const im = tmp[bin * 2 + 1]
      let mag = Math.sqrt(re * re + im * im)
      const scale = bin === 0 ? 1 / blockSize : 2 / blockSize
      mag *= scale * windowCorrection
      if (velocity && bin > 0) {
        const freq = (bin * fs) / blockSize
        const omega = 2 * Math.PI * freq
        if (omega > 0) {
          mag /= omega
        }
      }
      result[bin] += mag
    }
  }

  for (let bin = 0; bin < result.length; bin += 1) {
    result[bin] /= Math.max(1, Math.min(averages, Math.floor(buffer.length / blockSize)))
  }

  return result
}

function getCoherentGain(window: AverageOptions['window']): number {
  switch (window) {
    case 'hamming':
      return 0.54
    case 'blackman':
      return 0.42
    case 'hanning':
    default:
      return 0.5
  }
}

function averagePhase(buffer: Float32Array, opts: AverageOptions): Float32Array {
  const { fs, window, blockSize, averages } = opts
  const fft = new FFT(blockSize)
  const tmp = fft.createComplexArray()
  const result = new Float32Array(Math.floor(blockSize / 2))
  const segment = new Float32Array(blockSize)

  for (let avg = 0; avg < averages; avg += 1) {
    const offset = avg * blockSize
    if (offset + blockSize > buffer.length) break
    segment.set(buffer.slice(offset, offset + blockSize))
    const windowed = applyWindow(segment, window)
    fft.realTransform(tmp, windowed)
    fft.completeSpectrum(tmp)

    for (let bin = 0; bin < result.length; bin += 1) {
      const re = tmp[bin * 2]
      const im = tmp[bin * 2 + 1]
      result[bin] += Math.atan2(im, re)
    }
  }

  for (let bin = 0; bin < result.length; bin += 1) {
    result[bin] /= Math.max(1, Math.min(averages, Math.floor(buffer.length / blockSize)))
  }

  return result
}
