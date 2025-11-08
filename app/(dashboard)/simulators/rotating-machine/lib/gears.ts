import type { GearGeometry, MachineConfig } from '../types'
import { rpmToHz } from './units'

export function gearMeshFrequency(machine: MachineConfig, gear: GearGeometry): number {
  return rpmToHz(machine.rpm) * gear.teeth
}

export function gearSidebandFrequencies(machine: MachineConfig, gear: GearGeometry, count = 3): number[] {
  const base = gearMeshFrequency(machine, gear)
  const shaftHz = rpmToHz(machine.rpm)
  const freqs: number[] = []
  for (let i = 1; i <= count; i += 1) {
    freqs.push(base - i * shaftHz)
    freqs.push(base + i * shaftHz)
  }
  return freqs.sort((a, b) => a - b)
}
