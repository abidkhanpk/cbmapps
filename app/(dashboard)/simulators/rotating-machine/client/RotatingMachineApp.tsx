'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ControlsPanel } from '../components/ControlsPanel'
import { MachineScene } from '../components/MachineScene'
import { WaveformChart } from '../components/WaveformChart'
import { SpectrumChart } from '../components/SpectrumChart'
import { PhaseChart } from '../components/PhaseChart'
import { PolarPlot } from '../components/PolarPlot'
import { ExportButtons } from '../components/ExportButtons'
import { PlaybackBar } from '../components/PlaybackBar'
import { useSimulatorStore } from '../hooks/useSimulatorStore'
import type {
  SimulationResults,
  WorkerFFTRequest,
  WorkerFFTResponse,
  WorkerSynthesisRequest,
  WorkerSynthesisResponse,
} from '../types'
import { runSynthesisJob } from '../lib/simulator'

const palette = ['#0ea5e9', '#22c55e', '#f97316', '#6366f1']

export default function RotatingMachineApp() {
  // Select store slices individually to avoid unnecessary re-renders and
  // reduce risk of cascading updates when the store changes.
  const machine = useSimulatorStore(state => state.machine)
  const sensors = useSimulatorStore(state => state.sensors)
  const fault = useSimulatorStore(state => state.fault)
  const synthesis = useSimulatorStore(state => state.synthesis)
  const analysis = useSimulatorStore(state => state.analysis)
  const playback = useSimulatorStore(state => state.playback)
  const results = useSimulatorStore(state => state.results)
  const busy = useSimulatorStore(state => state.busy)

  // Stable setter functions
  const setResults = useSimulatorStore(state => state.setResults)
  const setPlayback = useSimulatorStore(state => state.setPlayback)
  const setBusy = useSimulatorStore(state => state.setBusy)

  const [activeTab, setActiveTab] = useState<'twf' | 'spectrum' | 'phase' | 'polar'>('twf')
  const chartRef = useRef<HTMLDivElement>(null)
  const keyboardStateRef = useRef(playback)
  const postedFftRef = useRef<string | null>(null)
  const [synthesisWorker, setSynthesisWorker] = useState<Worker | null>(null)
  const [fftWorker, setFftWorker] = useState<Worker | null>(null)
  const [fallbackMode, setFallbackMode] = useState(false)

  const playhead = playback.playhead ?? 0

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.Worker === 'undefined') {
      setFallbackMode(true)
      return
    }
    try {
      const worker = new Worker(new URL('../workers/synthesisWorker.ts', import.meta.url), { type: 'module' })
      const handleError = (error: ErrorEvent) => {
        console.error('[SYNTH-worker] runtime error', error)
        setFallbackMode(true)
      }
      worker.addEventListener('error', handleError)
      setSynthesisWorker(worker)
      return () => {
        worker.removeEventListener('error', handleError)
        worker.terminate()
      }
    } catch (error) {
      console.error('[SYNTH-worker] init failed', error)
      setFallbackMode(true)
    }
  }, [])

  useEffect(() => {
    const worker = new Worker(new URL('../workers/fftWorker.ts', import.meta.url), { type: 'module' })
    setFftWorker(worker)
    return () => worker.terminate()
  }, [])

  useEffect(() => {
    const requestId = uniqueId()
    const payload: WorkerSynthesisRequest['payload'] = {
      machine,
      sensors,
      fault,
      synthesis,
      analysis,
      amplitudeScale: playback.linkToAmplitude ? Math.max(0.1, playback.exaggeration) : 1,
    }
    postedFftRef.current = null
    setBusy(true)

    if (fallbackMode || !synthesisWorker) {
      try {
        const result = runSynthesisJob(requestId, payload)
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[SYNTH-inline] completed', { requestId, sensors: Object.keys(result.time) })
        }
        setResults(result)
      } catch (error) {
        console.error('[SYNTH-inline] failed', error)
      } finally {
        setBusy(false)
      }
      return
    }

    const message: WorkerSynthesisRequest = { type: 'synthesize', requestId, payload }
    const handler = (event: MessageEvent<WorkerSynthesisResponse>) => {
      if (event.data.type === 'synthesisResult' && event.data.requestId === requestId) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[SYNTH-worker] completed', {
            requestId,
            sensors: Object.keys(event.data.payload.time),
          })
        }
        setResults(event.data.payload)
        setBusy(false)
      }
    }
    const handleError = (error: ErrorEvent) => {
      console.error('[SYNTH-worker] error', error)
      setFallbackMode(true)
      setBusy(false)
    }

    synthesisWorker.addEventListener('message', handler)
    synthesisWorker.addEventListener('error', handleError)
    synthesisWorker.postMessage(message)
    return () => {
      synthesisWorker.removeEventListener('message', handler)
      synthesisWorker.removeEventListener('error', handleError)
    }
  }, [
    fallbackMode,
    synthesisWorker,
    machine,
    sensors,
    fault,
    synthesis,
    analysis,
    playback.exaggeration,
    playback.linkToAmplitude,
    setBusy,
    setResults,
  ])

  useEffect(() => {
    keyboardStateRef.current = playback
  }, [playback])

  const timeSeries = results?.time
  const tachSeries = results?.tach
  const envelopeSeries = results?.envelope
  const hasSpectrum = Boolean(results?.spectrum)
  const resultsRequestId = results?.requestId
  const resultsGeneratedAt = results?.generatedAt

  useEffect(() => {
    if (!fftWorker || !timeSeries || !tachSeries || hasSpectrum || !resultsRequestId || !resultsGeneratedAt) return
    const requestKey = `${resultsRequestId}:${resultsGeneratedAt}`
    if (postedFftRef.current === requestKey) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[FFT] skipping duplicate request', requestKey)
      }
      return
    }
    const requestId = uniqueId()
    postedFftRef.current = requestKey
    const message: WorkerFFTRequest = {
      type: 'fft',
      requestId,
      payload: {
        time: timeSeries,
        tach: tachSeries,
        fs: synthesis.fs,
        window: analysis.window,
        averages: analysis.averages,
        blockSize: synthesis.blockSize,
        envelope: analysis.envelope ? envelopeSeries : undefined,
        velocity: analysis.velocity,
      },
    }
    const handler = (event: MessageEvent<WorkerFFTResponse>) => {
      if (event.data.type === 'fftResult' && event.data.requestId === requestId) {
        postedFftRef.current = requestKey
        useSimulatorStore.setState(state => ({
          results: state.results
            ? {
                ...state.results,
                spectrum: event.data.payload,
              }
            : state.results,
        }))
      }
    }
    fftWorker.addEventListener('message', handler)
    fftWorker.postMessage(message)
    return () => fftWorker.removeEventListener('message', handler)
  }, [
    fftWorker,
    resultsRequestId,
    resultsGeneratedAt,
    timeSeries,
    tachSeries,
    envelopeSeries,
    hasSpectrum,
    synthesis.fs,
    synthesis.blockSize,
    analysis.window,
    analysis.averages,
    analysis.envelope,
    analysis.velocity,
  ])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (event.target as HTMLElement)?.isContentEditable) return
      const current = keyboardStateRef.current
      if (event.key === ' ') {
        event.preventDefault()
        setPlayback({ playing: !current.playing })
      } else if (event.key === '[') {
        event.preventDefault()
        setPlayback({ slowmo: Math.max(0.1, current.slowmo - 0.05) })
      } else if (event.key === ']') {
        event.preventDefault()
        setPlayback({ slowmo: Math.min(1, current.slowmo + 0.05) })
      } else if (event.key === '-') {
        setPlayback({ exaggeration: Math.max(0, current.exaggeration - 0.5) })
      } else if (event.key === '=') {
        setPlayback({ exaggeration: Math.min(10, current.exaggeration + 0.5) })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setPlayback])

  const waveformSeries = useMemo(
    () =>
      sensors.map((sensor, index) => ({
        id: sensor.id,
        label: sensor.label ?? sensor.id,
        color: palette[index % palette.length],
        data: results?.time[sensor.id],
        stats: results?.stats[sensor.id],
      })),
    [sensors, results],
  )

  const exportPayload = useMemo(() => {
    if (!results) return undefined
    return {
      time: results.time,
      tach: results.tach,
      spectrum: results.spectrum,
      fs: synthesis.fs,
    }
  }, [results, synthesis.fs])

  const handleSeek = useCallback(
    (ratio: number) => {
      setPlayback({ playhead: ratio, playing: false })
    },
    [setPlayback],
  )

  const primarySensor = sensors[0]?.id
  const secondarySensor = sensors[1]?.id

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Simulator</p>
          <h1 className="text-2xl font-semibold text-slate-900">Rotating Machine Fault Lab</h1>
          <p className="text-sm text-slate-500">
            Interactive vibration analytics for motor–coupling–rotor systems. Select a fault to see how motion, TWF, FFT and phase respond.
          </p>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-xs uppercase tracking-widest text-slate-500">RPM</span>
          <span className="text-3xl font-bold text-slate-900">{machine.rpm.toFixed(0)}</span>
          <span className="text-xs text-slate-500">{busy ? 'Synthesizing…' : 'Live'}</span>
        </div>
      </header>

      <div className="simulator-layout">
        <div className="simulator-top-grid">
          <ControlsPanel />
          <MachineScene motion={results?.motion} sensors={sensors} exaggeration={playback.exaggeration} slowmo={playback.slowmo} />
        </div>
        <div ref={chartRef} className="glass-panel flex flex-col gap-4 p-5">
          <div className="panel-header">
            <h2>Analytics</h2>
            <div className="flex gap-2 text-xs font-semibold text-slate-500">
              {['twf', 'spectrum', 'phase', 'polar'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`rounded-full px-3 py-1 ${
                    activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab === 'twf' && 'Time Waveform'}
                  {tab === 'spectrum' && 'Spectrum'}
                  {tab === 'phase' && 'Phase'}
                  {tab === 'polar' && 'Polar / Orbit'}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'twf' && (
            <WaveformChart series={waveformSeries} fs={synthesis.fs} playhead={playhead} duration={synthesis.seconds} />
          )}

          {activeTab === 'spectrum' && (
            <SpectrumChart
              spectrum={results?.spectrum}
              markers={results?.markers}
              sensorOrder={sensors.map(sensor => sensor.id)}
              fmax={analysis.fmax}
            />
          )}

          {activeTab === 'phase' && (
            <PhaseChart spectrum={results?.spectrum} primarySensor={primarySensor} referenceSensor={secondarySensor} fmax={analysis.fmax} />
          )}

          {activeTab === 'polar' && <PolarPlot motion={results?.motion} />}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {waveformSeries.map(
              series =>
                series.stats && (
                  <div key={series.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{series.label}</p>
                    <p className="text-sm text-slate-600">RMS {series.stats.rms.toFixed(3)}</p>
                    <p className="text-sm text-slate-600">Pk {series.stats.peak.toFixed(3)}</p>
                    <p className="text-sm text-slate-600">Pk-Pk {series.stats.peakToPeak.toFixed(3)}</p>
                  </div>
                ),
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(320px,400px)_1fr]">
        <PlaybackBar duration={synthesis.seconds} playhead={playhead} onSeek={handleSeek} />
        <ExportButtons data={exportPayload} chartRef={chartRef} />
      </div>
    </div>
  )
}

function uniqueId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
