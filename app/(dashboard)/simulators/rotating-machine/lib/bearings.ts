import { rpmToHz } from './units'
import type { BearingGeometry, MachineConfig } from '../types'

export interface BearingFrequencies {
  bpfo: number
  bpfi: number
  bsf: number
  ftf: number
}

/**
 * Computes classic bearing fault frequencies.
 */
export function calculateBearingFaults(machine: MachineConfig, geometry: BearingGeometry): BearingFrequencies {
  const shaftHz = rpmToHz(machine.rpm)
  const d = geometry.rollerDiameter_mm
  const D = geometry.pitchDiameter_mm
  const ratio = d / D
  const angleRad = (geometry.contactAngle_deg * Math.PI) / 180
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)

  const bpfo = (geometry.rollers / 2) * shaftHz * (1 - ratio * cos)
  const bpfi = (geometry.rollers / 2) * shaftHz * (1 + ratio * cos)
  const bsf = (D / (2 * d)) * shaftHz * (1 - Math.pow(ratio * cos, 2))
  const ftf = 0.5 * shaftHz * (1 - ratio * cos)

  return { bpfo, bpfi, bsf, ftf }
}

export function bearingFaultLabel(id: 'bpfo' | 'bpfi' | 'bsf' | 'ftf'): string {
  switch (id) {
    case 'bpfo':
      return 'BPFO'
    case 'bpfi':
      return 'BPFI'
    case 'bsf':
      return 'BSF'
    case 'ftf':
      return 'FTF'
    default:
      return id
  }
}

export function ensureBearingGeometry(config?: BearingGeometry): asserts config is BearingGeometry {
  if (!config) {
    throw new Error('Bearing geometry is required for bearing faults.')
  }
}
