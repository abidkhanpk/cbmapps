import { describe, expect, it } from 'vitest'

import { calculateBearingFaults } from '../lib/bearings'
import type { BearingGeometry, MachineConfig } from '../types'

describe('calculateBearingFaults', () => {
  const machine: MachineConfig = { rpm: 1800, load: 1, units: 'mm/s' }
  const geometry: BearingGeometry = {
    rollers: 8,
    pitchDiameter_mm: 120,
    rollerDiameter_mm: 15,
    contactAngle_deg: 15,
  }

  it('computes fault frequencies within 1% error', () => {
    const result = calculateBearingFaults(machine, geometry)
    const shaftHz = machine.rpm / 60
    const ratio = geometry.rollerDiameter_mm / geometry.pitchDiameter_mm
    const angle = (geometry.contactAngle_deg * Math.PI) / 180
    const expectedBpfo = (geometry.rollers / 2) * shaftHz * (1 - ratio * Math.cos(angle))
    const expectedBpfi = (geometry.rollers / 2) * shaftHz * (1 + ratio * Math.cos(angle))
    const expectedBsf = (geometry.pitchDiameter_mm / (2 * geometry.rollerDiameter_mm)) * shaftHz * (1 - Math.pow(ratio * Math.cos(angle), 2))

    expect(relativeError(result.bpfo, expectedBpfo)).toBeLessThan(0.01)
    expect(relativeError(result.bpfi, expectedBpfi)).toBeLessThan(0.01)
    expect(relativeError(result.bsf, expectedBsf)).toBeLessThan(0.01)
  })
})

function relativeError(value: number, reference: number) {
  return Math.abs(value - reference) / reference
}
