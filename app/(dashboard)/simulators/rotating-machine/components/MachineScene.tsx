'use client'

import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import type { MotionDescriptor, Sensor } from '../types'

interface MachineSceneProps {
  motion?: MotionDescriptor
  sensors: Sensor[]
  exaggeration: number
  slowmo: number
}

export function MachineScene({ motion, sensors, exaggeration, slowmo }: MachineSceneProps) {
  return (
    <div className="glass-panel relative h-[520px] overflow-hidden">
      <div className="panel-header px-6 pt-4">
        <h2>Machine Model</h2>
        <p className="text-xs uppercase tracking-widest text-slate-500">3D preview</p>
      </div>
      <Canvas shadows camera={{ position: [6, 4, 8], fov: 40 }}>
        <color attach="background" args={['#f8fafc']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
        <gridHelper args={[20, 20, '#cbd5f5', '#e2e8f0']} />
        <Suspense fallback={null}>
          <MachineAssembly motion={motion} sensors={sensors} exaggeration={exaggeration} slowmo={slowmo} />
        </Suspense>
        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.1} minDistance={6} maxDistance={12} />
      </Canvas>
    </div>
  )
}

function MachineAssembly({
  motion,
  sensors,
  exaggeration,
  slowmo,
}: {
  motion?: MotionDescriptor
  sensors: Sensor[]
  exaggeration: number
  slowmo: number
}) {
  const shaftRef = useRef<THREE.Mesh>(null)
  const couplingRef = useRef<THREE.Mesh>(null)
  const rotorRef = useRef<THREE.Mesh>(null)

  const orbitAmplitude = (motion?.orbitMajor ?? 0.4) * exaggeration * 0.002
  const axialAmplitude = (motion?.axial ?? 0.1) * exaggeration * 0.001

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime * slowmo * 4
    const radialX = Math.sin(t) * orbitAmplitude
    const radialY = Math.cos(t + (motion?.phaseLag ?? 0)) * orbitAmplitude * 0.8

    if (shaftRef.current) {
      shaftRef.current.position.x = radialX
      shaftRef.current.position.y = 0.5 + radialY
      shaftRef.current.rotation.z = Math.sin(t * 0.5) * 0.02 * exaggeration
    }
    if (rotorRef.current) {
      rotorRef.current.position.x = radialX * 1.2
      rotorRef.current.position.y = 0.9 + radialY
      rotorRef.current.rotation.x = Math.sin(t) * 0.1 * exaggeration
    }
    if (couplingRef.current) {
      couplingRef.current.rotation.z = Math.sin(t * 0.5) * 0.08 * exaggeration
      couplingRef.current.position.z = axialAmplitude * Math.sin(t * 0.7)
    }
  })

  const sensorMeshes = useMemo(() => sensors.map(sensorToMesh), [sensors])

  return (
    <group>
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[6, 0.2, 2]} />
        <meshStandardMaterial color="#cbd5f5" metalness={0.1} roughness={0.8} />
      </mesh>

      <mesh position={[-1.8, 0.8, 0]} castShadow>
        <boxGeometry args={[1.6, 1.2, 1.4]} />
        <meshStandardMaterial color="#475569" metalness={0.4} roughness={0.4} />
      </mesh>

      <mesh position={[1.4, 0.6, 0]} castShadow>
        <boxGeometry args={[2, 1, 1.2]} />
        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.4} />
      </mesh>

      <mesh ref={shaftRef} position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 4]} />
        <meshStandardMaterial color="#747c92" metalness={0.8} roughness={0.2} />
      </mesh>

      <mesh ref={couplingRef} position={[-0.5, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 32]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
      </mesh>

      <mesh ref={rotorRef} position={[1.2, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 1.4, 32]} />
        <meshStandardMaterial color="#475569" />
      </mesh>

      <Bearings />

      {sensorMeshes.map(mesh => (
        <group key={mesh.key} position={mesh.position}>
          <mesh>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color={mesh.color} />
          </mesh>
          <Html center>
            <span className="rounded bg-white/80 px-2 py-0.5 text-xs text-slate-700 shadow">{mesh.label}</span>
          </Html>
        </group>
      ))}
    </group>
  )
}

const sensorPositions: Record<Sensor['location'], THREE.Vector3> = {
  DE: new THREE.Vector3(1.6, 1.1, 0.8),
  NDE: new THREE.Vector3(-1.6, 1, -0.8),
  AX: new THREE.Vector3(0.2, 1.2, -1),
  BASE: new THREE.Vector3(0, 0.4, 1),
}

function sensorToMesh(sensor: Sensor) {
  const position = sensorPositions[sensor.location] ?? new THREE.Vector3()
  const color = sensor.axis === 'Z' ? '#0ea5e9' : sensor.axis === 'Y' ? '#10b981' : '#f97316'
  return {
    position,
    color,
    label: sensor.label ?? sensor.id,
    key: sensor.id,
  }
}

function Bearings() {
  return (
    <>
      <mesh position={[0.8, 0.4, -0.8]}>
        <boxGeometry args={[0.8, 0.6, 0.6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[-0.8, 0.4, 0.8]}>
        <boxGeometry args={[0.8, 0.6, 0.6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
    </>
  )
}
