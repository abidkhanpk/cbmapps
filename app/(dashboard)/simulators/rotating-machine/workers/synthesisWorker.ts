/// <reference lib="webworker" />

import type {
  FaultPlan,
  SimulationResults,
  WorkerSynthesisRequest,
  WorkerSynthesisResponse,
} from '../types'
import { buildFaultPlan } from '../lib/faults'
import { computeStats, createRpmProfile, mulberry32, synthesizeSeries } from '../lib/signal'
import { hilbertEnvelope } from '../lib/envelope'
import { phaseLagFromTimeSeries } from '../lib/phase'

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope

ctx.addEventListener('message', event => {
  const message = event.data as WorkerSynthesisRequest
  if (message.type === 'synthesize') {
    handleSynthesis(message)
  }
})

function handleSynthesis(message: WorkerSynthesisRequest) {
  const { machine, sensors, fault, synthesis, analysis, amplitudeScale } = message.payload
  const samples = Math.floor(synthesis.fs * synthesis.seconds)
  const rpmProfile = createRpmProfile({
    rpm: machine.rpm,
    samples,
    fs: synthesis.fs,
    ramp: machine.ramp,
  })
  const plan = buildFaultPlan({ machine, fault, sensors })
  const rng = mulberry32(synthesis.seed)

  const time: Record<string, Float32Array> = {}
  const envelopeRecord: Record<string, Float32Array> = {}
  const stats: Record<string, ReturnType<typeof computeStats>> = {}

  sensors.forEach(sensor => {
    const synthesised = synthesizeSeries({
      samples,
      fs: synthesis.fs,
      rpmProfile,
      harmonics: scaleHarmonics(plan, amplitudeScale),
      sidebands: plan.sidebands,
      impacts: plan.impacts,
      sensor,
      noiseRms: plan.broadbandRms + synthesis.noiseRms,
      rng,
    })
    time[sensor.id] = synthesised
    stats[sensor.id] = computeStats(synthesised)
    if (analysis.envelope) {
      envelopeRecord[sensor.id] = hilbertEnvelope(synthesised)
    }
  })

  const tach = new Float32Array(samples)
  for (let i = 0; i < samples; i += 1) {
    const t = i / synthesis.fs
    const omega = (rpmProfile[i] / 60) * 2 * Math.PI
    tach[i] = Math.sin(omega * t)
  }

  const motion = createMotionDescriptor(plan, time, sensors, fault.severity)

  const payload: SimulationResults = {
    requestId: message.requestId,
    time,
    stats,
    tach,
    envelope: analysis.envelope ? envelopeRecord : undefined,
    motion,
    generatedAt: Date.now(),
    markers: plan.markers,
  }

  const transferables: Transferable[] = [
    ...Object.values(time).map(series => series.buffer),
    tach.buffer,
    ...(payload.envelope ? Object.values(payload.envelope).map(series => series.buffer) : []),
  ]

  const response: WorkerSynthesisResponse = {
    type: 'synthesisResult',
    requestId: message.requestId,
    payload,
  }

  ctx.postMessage(response, transferables)
}

function scaleHarmonics(plan: FaultPlan, scale: number) {
  return plan.harmonics.map(component => ({
    ...component,
    amplitude: component.amplitude * (scale || 1),
  }))
}

function createMotionDescriptor(
  plan: FaultPlan,
  time: Record<string, Float32Array>,
  sensors: { id: string }[],
  severity: number,
) {
  const first = sensors[0]?.id
  const second = sensors[1]?.id
  const mainAmplitude = plan.harmonics[0]?.amplitude ?? 0
  const orbitMinor = plan.harmonics[1]?.amplitude ?? mainAmplitude * 0.3
  const axial = (plan.axialBias ?? 0.2) * mainAmplitude
  const torsional = (plan.modulationDepth ?? 0.05) * mainAmplitude
  const phaseLag =
    first && second ? phaseLagFromTimeSeries(time[first], time[second]) : plan.harmonics[0]?.phaseDeg ?? 0
  return {
    orbitMajor: mainAmplitude,
    orbitMinor,
    axial,
    torsional,
    phaseLag,
    cue: plan.cue,
    severity,
  }
}

export {}
