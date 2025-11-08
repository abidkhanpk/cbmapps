/// <reference lib="webworker" />

import type { WorkerFFTRequest, WorkerFFTResponse } from '../types'
import { computeSpectrum } from '../lib/fft'

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope

ctx.addEventListener('message', event => {
  const message = event.data as WorkerFFTRequest
  if (message.type === 'fft') {
    const spectrum = computeSpectrum({
      time: message.payload.time,
      fs: message.payload.fs,
      window: message.payload.window,
      blockSize: message.payload.blockSize,
      averages: message.payload.averages,
      velocity: message.payload.velocity,
      envelope: message.payload.envelope,
    })
    const response: WorkerFFTResponse = {
      type: 'fftResult',
      requestId: message.requestId,
      payload: spectrum,
    }
    const transfers = [
      spectrum.f.buffer,
      ...Object.values(spectrum.magnitude).map(arr => arr.buffer),
      ...Object.values(spectrum.phase).map(arr => arr.buffer),
      ...(spectrum.envelope ? Object.values(spectrum.envelope).map(arr => arr.buffer) : []),
    ]
    ctx.postMessage(response, transfers)
  }
})

export {}
