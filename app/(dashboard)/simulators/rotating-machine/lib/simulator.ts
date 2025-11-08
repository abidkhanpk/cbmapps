import type {
  MotionDescriptor,
  SimulationResults,
  WorkerSynthesisRequest,
} from '../types'
import { buildFaultPlan } from './faults'
import { computeStats, createRpmProfile, mulberry32, synthesizeSeries } from './signal'
import { hilbertEnvelope } from './envelope'
import { phaseLagFromTimeSeries } from './phase'

export function runSynthesisJob(
  requestId: string,
  payload: WorkerSynthesisRequest['payload'],
): SimulationResults {
  const { machine, sensors, fault, synthesis, analysis, amplitudeScale } = payload
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

  const motion = createMotionFromPlan(plan, time, sensors, fault.severity)

  return {
    requestId,
    time,
    stats,
    tach,
    envelope: analysis.envelope ? envelopeRecord : undefined,
    motion,
    generatedAt: Date.now(),
    markers: plan.markers,
  }
}

export function collectTransferables(result: SimulationResults): Transferable[] {
  const buffers: Transferable[] = [
    ...Object.values(result.time).map(series => series.buffer),
    result.tach.buffer,
  ]
  if (result.envelope) {
    buffers.push(...Object.values(result.envelope).map(series => series.buffer))
  }
  return buffers
}

function scaleHarmonics(
  plan: ReturnType<typeof buildFaultPlan>,
  scale: number,
) {
  return plan.harmonics.map(component => ({
    ...component,
    amplitude: component.amplitude * (scale || 1),
  }))
}

function createMotionFromPlan(
  plan: ReturnType<typeof buildFaultPlan>,
  time: Record<string, Float32Array>,
  sensors: { id: string }[],
  severity: number,
): MotionDescriptor {
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
