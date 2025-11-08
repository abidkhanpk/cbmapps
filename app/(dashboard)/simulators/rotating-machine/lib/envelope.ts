import FFT from 'fft.js'

export function hilbertEnvelope(signal: Float32Array): Float32Array {
  const n = signal.length
  const fft = new FFT(n)
  const spectrum = fft.createComplexArray()
  const analytic = fft.createComplexArray()
  const realInput = Array.from(signal)

  fft.realTransform(spectrum, realInput)
  fft.completeSpectrum(spectrum)

  for (let k = 0; k < n; k += 1) {
    let factor = 0
    if (k === 0) {
      factor = 1
    } else if (k < n / 2) {
      factor = 2
    } else if (k === n / 2) {
      factor = 1
    } else {
      factor = 0
    }
    spectrum[2 * k] *= factor
    spectrum[2 * k + 1] *= factor
  }

  fft.inverseTransform(analytic, spectrum)
  const envelope = new Float32Array(n)
  for (let i = 0; i < n; i += 1) {
    const re = analytic[2 * i] / n
    const im = analytic[2 * i + 1] / n
    envelope[i] = Math.sqrt(re * re + im * im)
  }
  return envelope
}
