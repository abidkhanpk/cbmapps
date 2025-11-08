const MM_PER_INCH = 25.4
const G = 9.80665

export function rpmToHz(rpm: number): number {
  return rpm / 60
}

export function hzToRpm(hz: number): number {
  return hz * 60
}

export function mmpsToInps(value: number): number {
  return value / MM_PER_INCH
}

export function inpsToMmps(value: number): number {
  return value * MM_PER_INCH
}

export function accelToVelocity(accel: number, dominantFrequencyHz: number): number {
  if (dominantFrequencyHz <= 0) return 0
  const omega = 2 * Math.PI * dominantFrequencyHz
  return accel / omega
}

export function convertMachineUnits(value: number, from: MachineUnit, to: MachineUnit): number {
  if (from === to) return value
  if (from === 'm/s2' && to === 'mm/s') {
    return accelToVelocity(value, 1) * 1000
  }
  if (from === 'm/s2' && to === 'in/s') {
    return accelToVelocity(value, 1) * 39.3701
  }
  if (from === 'mm/s' && to === 'in/s') {
    return mmpsToInps(value)
  }
  if (from === 'in/s' && to === 'mm/s') {
    return inpsToMmps(value)
  }
  if (from === 'mm/s' && to === 'm/s2') {
    return (value / 1000) * 2 * Math.PI
  }
  if (from === 'in/s' && to === 'm/s2') {
    return (value * 0.0254) * 2 * Math.PI
  }
  return value
}

export function gToMs2(value: number): number {
  return value * G
}

export function ms2ToG(value: number): number {
  return value / G
}

type MachineUnit = 'mm/s' | 'in/s' | 'm/s2'
