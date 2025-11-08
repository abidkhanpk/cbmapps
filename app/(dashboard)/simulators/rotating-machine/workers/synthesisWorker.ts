/// <reference lib="webworker" />

import type { WorkerSynthesisRequest, WorkerSynthesisResponse } from '../types'
import { collectTransferables, runSynthesisJob } from '../lib/simulator'

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope

ctx.addEventListener('message', event => {
  const message = event.data as WorkerSynthesisRequest
  if (message.type === 'synthesize') {
    handleSynthesis(message)
  }
})

function handleSynthesis(message: WorkerSynthesisRequest) {
  const payload = runSynthesisJob(message.requestId, message.payload)
  const transferables = collectTransferables(payload)
  const response: WorkerSynthesisResponse = {
    type: 'synthesisResult',
    requestId: message.requestId,
    payload,
  }

  ctx.postMessage(response, transferables)
}

export {}
