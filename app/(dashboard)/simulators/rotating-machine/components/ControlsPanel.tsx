'use client'

import { Fragment, useMemo } from 'react'
import { Pause, Play, Plus, RefreshCw, SlidersHorizontal, Trash2 } from 'lucide-react'

import { faultPresets } from '../lib/faults'
import { FaultBadge } from './FaultBadge'
import { useSimulatorStore } from '../hooks/useSimulatorStore'

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

  const togglePlayback = () => {
    setPlayback({ playing: !playback.playing })
  }

  const handleAddSensor = () => {
    if (!canAddSensor) return
    const id = `sensor-${Date.now()}`
    addSensor({ id, location: 'BASE', axis: 'X', label: `Sensor ${sensors.length + 1}` })
  }

  const windowOptions: Array<{ label: string; value: typeof analysis.window }> = [
    { label: 'Hanning', value: 'hanning' },
    { label: 'Hamming', value: 'hamming' },
    { label: 'Blackman', value: 'blackman' },
  ]

  return (
    <aside className="glass-panel flex flex-col gap-4 p-5">
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

      <section>
        <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Machine</span>
          <span>{machine.units}</span>
        </div>
        <label className="block text-xs font-semibold text-slate-600">
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
        <label className="mt-3 block text-xs font-semibold text-slate-600">
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
        <label className="mt-3 block text-xs font-semibold text-slate-600">
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
      </section>

      <section>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Fault mode</div>
        <select
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 focus:border-slate-400 focus:outline-none"
          value={fault.id}
          onChange={event => setFaultId(event.target.value as typeof fault.id)}
        >
          {faultPresets.map(item => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <label className="mt-3 block text-xs font-semibold text-slate-600">
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
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Sensors</span>
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
          {sensors.map(sensor => (
            <div key={sensor.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                {sensor.label ?? sensor.id}
                <button
                  type="button"
                  onClick={() => removeSensor(sensor.id)}
                  aria-label="Remove sensor"
                  className="text-slate-400 hover:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <select
                  className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm"
                  value={sensor.location}
                  onChange={event =>
                    useSimulatorStore.setState(state => ({
                      sensors: state.sensors.map(item =>
                        item.id === sensor.id ? { ...item, location: event.target.value as typeof sensor.location } : item,
                      ),
                    }))
                  }
                >
                  {['DE', 'NDE', 'AX', 'BASE'].map(loc => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                <select
                  className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm"
                  value={sensor.axis}
                  onChange={event =>
                    useSimulatorStore.setState(state => ({
                      sensors: state.sensors.map(item =>
                        item.id === sensor.id ? { ...item, axis: event.target.value as typeof sensor.axis } : item,
                      ),
                    }))
                  }
                >
                  {['X', 'Y', 'Z'].map(axis => (
                    <option key={axis} value={axis}>
                      Axis {axis}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Playback</div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-slate-600">
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
          <label className="text-xs font-semibold text-slate-600">
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
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={playback.linkToAmplitude}
            onChange={event => setPlayback({ linkToAmplitude: event.target.checked })}
          />
          Link exaggeration to amplitude
        </label>
        <button
          type="button"
          onClick={togglePlayback}
          className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {playback.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playback.playing ? 'Pause (Space)' : 'Play (Space)'}
        </button>
      </section>

      <section>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Analysis</div>
        <div className="grid gap-2">
          <label className="text-xs font-semibold text-slate-600">
            Window
            <select
              value={analysis.window}
              onChange={event => setAnalysis({ window: event.target.value as typeof analysis.window })}
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
            >
              {windowOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
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
          <label className="text-xs font-semibold text-slate-600">
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
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
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
      </section>

      <button
        type="button"
        onClick={reset}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
      >
        <RefreshCw className="h-4 w-4" />
        Reset
      </button>
    </aside>
  )
}
