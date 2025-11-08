'use client'

import { useEffect, useState } from 'react'
import { Pause, Play, Plus, RefreshCw, SlidersHorizontal, Trash2 } from 'lucide-react'

import { faultPresets } from '../lib/faults'
import { FaultBadge } from './FaultBadge'
import { useSimulatorStore } from '../hooks/useSimulatorStore'
import { Accordion, Collapsible } from './Collapsible'

const POW2_OPTIONS = [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768]
const LOR_OPTIONS = POW2_OPTIONS.map(n => Math.round(n / 2.56))
const LOCATION_OPTIONS: Array<{ label: string; value: SensorLocation }> = [
  { label: 'DE', value: 'DE' },
  { label: 'NDE', value: 'NDE' },
  { label: 'Base', value: 'BASE' },
]
const AXIS_OPTIONS: Array<{ label: string; value: SensorAxis }> = [
  { label: 'Horizontal', value: 'X' },
  { label: 'Vertical', value: 'Y' },
  { label: 'Axial', value: 'Z' },
]
const WINDOW_OPTIONS: Array<{ label: string; value: 'hanning' | 'hamming' | 'blackman' }> = [
  { label: 'Hanning', value: 'hanning' },
  { label: 'Hamming', value: 'hamming' },
  { label: 'Blackman', value: 'blackman' },
]

type SensorAxis = 'X' | 'Y' | 'Z'
type SensorLocation = 'DE' | 'NDE' | 'BASE' | 'AX'

export function ControlsPanel() {
  const {
    machine,
    setMachine,
    playback,
    setPlayback,
    fault,
    setFault,
    setFaultId,
    sensors,
    addSensor,
    removeSensor,
    analysis,
    setAnalysis,
    synthesis,
    setSynthesis,
    reset,
  } = useSimulatorStore()

  const descriptor = faultPresets.find(item => item.id === fault.id) ?? faultPresets[0]
  const canAddSensor = sensors.length < 4

  const [fmaxInput, setFmaxInput] = useState(() => Math.round(analysis.fmax).toString())
  useEffect(() => {
    setFmaxInput(String(Math.round(analysis.fmax)))
  }, [analysis.fmax])

  const commitFmax = (raw?: string) => {
    const text = raw ?? fmaxInput
    const parsed = Number(text)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFmaxInput(String(Math.round(analysis.fmax)))
      return
    }
    const nyquist = Math.round(synthesis.fs / 2)
    const clamped = Math.max(50, Math.min(parsed, nyquist))
    setAnalysis({ fmax: clamped })
    setFmaxInput(String(Math.round(clamped)))
  }

  const handleLorChange = (value: number) => {
    setAnalysis({ lines: value })
    const idx = LOR_OPTIONS.indexOf(value)
    if (idx >= 0) {
      setSynthesis({ blockSize: POW2_OPTIONS[idx] })
    }
  }

  const handleAddSensor = () => {
    if (!canAddSensor) return
    const id = `sensor-${Date.now()}`
    addSensor({ id, location: 'DE', axis: 'X', label: `Sensor ${sensors.length + 1}` })
  }

  return (
    <aside className="glass-panel flex flex-col gap-2 p-5">
      <div className="panel-header">
        <h2>Controls</h2>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Runtime
        </div>
      </div>

      <FaultBadge
        label={descriptor.label}
        description={descriptor.description}
        severity={fault.severity}
        hint={descriptor.severityHint}
        indicators={descriptor.indicators}
      />

      <Accordion defaultOpenId={null}>
        <Collapsible id="machine" title="Machine Setup" defaultOpen={false}>
          <div className="grid gap-4 text-xs font-semibold text-slate-600">
            <div className="space-y-3">
              <label className="block">
                Speed (RPM)
                <input
                  type="range"
                  min={300}
                  max={6000}
                  step={30}
                  value={machine.rpm}
                  onChange={event => setMachine({ rpm: Number(event.target.value) })}
                  className="mt-2 w-full accent-sky-500"
                />
                <span className="text-sm text-slate-900">{machine.rpm.toFixed(0)} RPM</span>
              </label>
              <label className="block">
                Load Factor
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={machine.load}
                  onChange={event => setMachine({ load: Number(event.target.value) })}
                  className="mt-2 w-full accent-emerald-500"
                />
                <span className="text-sm text-slate-900">{Math.round(machine.load * 100)}%</span>
              </label>
              <label className="block">
                Duration {synthesis.seconds.toFixed(1)}s
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={synthesis.seconds}
                  onChange={event => setSynthesis({ seconds: Number(event.target.value) })}
                  className="mt-2 w-full accent-purple-500"
                />
              </label>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600">
                Fault mode
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 focus:border-slate-400 focus:outline-none"
                  value={fault.id}
                  onChange={event => setFaultId(event.target.value as typeof fault.id)}
                >
                  {faultPresets.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Severity {Math.round(fault.severity * 100)}%
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={fault.severity}
                  onChange={event => setFault({ severity: Number(event.target.value) })}
                  className="mt-2 w-full accent-rose-500"
                />
              </label>
            </div>
          </div>
        </Collapsible>

        <Collapsible id="sensors" title="Sensors" defaultOpen={false}>
          <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Active sensors</span>
            <button
              type="button"
              onClick={handleAddSensor}
              disabled={!canAddSensor}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-slate-600 disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
          <div className="space-y-3">
            {sensors.map(sensor => {
              const safeLocation = LOCATION_OPTIONS.some(option => option.value === sensor.location) ? sensor.location : 'BASE'
              const safeAxis = AXIS_OPTIONS.some(option => option.value === sensor.axis) ? sensor.axis : 'X'
              return (
                <div key={sensor.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <input
                    type="text"
                    value={sensor.label ?? ''}
                    onChange={event =>
                      useSimulatorStore.setState(state => ({
                        sensors: state.sensors.map(item =>
                          item.id === sensor.id ? { ...item, label: event.target.value } : item,
                        ),
                      }))
                    }
                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 focus:border-slate-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeSensor(sensor.id)}
                    aria-label="Remove sensor"
                    className="ml-2 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <select
                    className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                    value={safeLocation}
                    onChange={event =>
                      useSimulatorStore.setState(state => ({
                        sensors: state.sensors.map(item =>
                          item.id === sensor.id ? { ...item, location: event.target.value as SensorLocation } : item,
                        ),
                      }))
                    }
                  >
                    {LOCATION_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                    value={safeAxis}
                    onChange={event =>
                      useSimulatorStore.setState(state => ({
                        sensors: state.sensors.map(item =>
                          item.id === sensor.id ? { ...item, axis: event.target.value as SensorAxis } : item,
                        ),
                      }))
                    }
                  >
                    {AXIS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              )
            })}
          </div>
        </Collapsible>

        <Collapsible id="playback" title="Playback" defaultOpen={false}>
          <div className="grid gap-2 text-xs font-semibold text-slate-600">
            <label className="block">
              Exaggeration {playback.exaggeration.toFixed(1)}×
              <input
                type="range"
                min={0}
                max={10}
                step={0.1}
                value={playback.exaggeration}
                onChange={event => setPlayback({ exaggeration: Number(event.target.value) })}
                className="mt-1 w-full accent-rose-500"
              />
            </label>
            <label className="block">
              Slow-Mo {playback.slowmo.toFixed(2)}×
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={playback.slowmo}
                onChange={event => setPlayback({ slowmo: Number(event.target.value) })}
                className="mt-1 w-full accent-sky-500"
              />
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={playback.linkToAmplitude}
                onChange={event => setPlayback({ linkToAmplitude: event.target.checked })}
              />
              Link exaggeration to amplitude
            </label>
            <button
              type="button"
              onClick={() => setPlayback({ playing: !playback.playing })}
              className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {playback.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playback.playing ? 'Pause (Space)' : 'Play (Space)'}
            </button>
          </div>
        </Collapsible>

        <Collapsible id="analysis" title="Analysis" defaultOpen={false}>
          <div className="space-y-4 text-xs font-semibold text-slate-600">
            <label className="block">
              Window
              <select
                value={analysis.window}
                onChange={event => setAnalysis({ window: event.target.value as typeof analysis.window })}
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
              >
                {WINDOW_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Averages {analysis.averages}
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={analysis.averages}
                onChange={event => setAnalysis({ averages: Number(event.target.value) })}
                className="mt-2 w-full accent-emerald-500"
              />
            </label>
            <label className="block">
              Block Size {synthesis.blockSize}
              <input
                type="range"
                min={1024}
                max={8192}
                step={1024}
                value={synthesis.blockSize}
                onChange={event => setSynthesis({ blockSize: Number(event.target.value) })}
                className="mt-2 w-full accent-purple-500"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span>Fmax (Hz)</span>
                <input
                  type="text"
                  value={fmaxInput}
                  onChange={event => setFmaxInput(event.target.value)}
                  onBlur={() => commitFmax()}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      commitFmax()
                    }
                  }}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>Lines of Resolution</span>
                <select
                  value={analysis.lines}
                  onChange={event => handleLorChange(Number(event.target.value))}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                >
                  {LOR_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-center text-[11px] uppercase tracking-widest text-slate-400">
              Δf ≈ {(analysis.fmax / Math.max(1, analysis.lines)).toFixed(2)} Hz
            </p>
            <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={analysis.envelope}
                  onChange={event => setAnalysis({ envelope: event.target.checked })}
                />
                Envelope
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={analysis.orderTracking}
                  onChange={event => setAnalysis({ orderTracking: event.target.checked })}
                />
                Order Tracking
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={analysis.velocity}
                  onChange={event => setAnalysis({ velocity: event.target.checked })}
                />
                Velocity
              </label>
            </div>
          </div>
        </Collapsible>
      </Accordion>

      <button
        type="button"
        onClick={reset}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
      >
        <RefreshCw className="h-4 w-4" />
        Reset
      </button>
    </aside>
  )
}
