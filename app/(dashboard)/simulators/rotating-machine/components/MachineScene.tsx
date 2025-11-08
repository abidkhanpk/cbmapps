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
      <Canvas shadows camera={{ position: [9, 5, 10], fov: 40 }}>
        <color attach="background" args={['#eef2ff']} />
        <ambientLight intensity={0.6} />
        <spotLight position={[6, 10, 6]} intensity={1.4} castShadow angle={0.4} penumbra={0.6} />
        <directionalLight position={[-6, 4, -3]} intensity={0.4} />
        <gridHelper args={[20, 20, '#cbd5f5', '#e2e8f0']} />
        <Suspense fallback={null}>
          <MachineAssembly motion={motion} sensors={sensors} exaggeration={exaggeration} slowmo={slowmo} />
        </Suspense>
        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.1} minDistance={6} maxDistance={14} />
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
  const motorGroupRef = useRef<THREE.Group>(null)
  const pumpGroupRef = useRef<THREE.Group>(null)
  const couplingRef = useRef<THREE.Mesh>(null)

  const orbitAmplitude = (motion?.orbitMajor ?? 0.4) * exaggeration * 0.002
  const axialAmplitude = (motion?.axial ?? 0.1) * exaggeration * 0.001

  useFrame(state => {
    const t = state.clock.elapsedTime * slowmo * 3
    const radial = Math.sin(t) * orbitAmplitude
    const axial = Math.cos(t + (motion?.phaseLag ?? 0)) * axialAmplitude

    if (shaftRef.current) {
      shaftRef.current.rotation.z = Math.sin(t * 0.5) * 0.03 * exaggeration
    }

    if (motorGroupRef.current) {
      motorGroupRef.current.position.y = 0.85 + radial
      motorGroupRef.current.position.z = axial * 0.3
      motorGroupRef.current.rotation.x = Math.sin(t * 0.3) * 0.01 * exaggeration
    }

    if (pumpGroupRef.current) {
      pumpGroupRef.current.position.y = 0.92 + radial * 0.8
      pumpGroupRef.current.rotation.z = Math.cos(t * 0.4) * 0.015 * exaggeration
    }

    if (couplingRef.current) {
      couplingRef.current.position.z = axial
      couplingRef.current.rotation.y = t * 0.5
    }
  })

  const sensorMeshes = useMemo(() => sensors.map(sensorToMesh), [sensors])

  return (
    <group>
      <BasePlate />
      <FoundationBolts />
      <group ref={motorGroupRef} position={[-2.6, 0.85, 0]}>
        <Motor />
      </group>
      <group ref={pumpGroupRef} position={[2.4, 0.95, 0]}>
        <Pump />
      </group>
      <mesh ref={shaftRef} position={[0, 0.9, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 6.2, 32]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh ref={couplingRef} castShadow position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.8, 32]} />
        <meshStandardMaterial color="#f87171" metalness={0.8} roughness={0.2} />
      </mesh>
      <BearingBlocks />
      <Pipework />

      {sensorMeshes.map(mesh => (
        <group key={mesh.key} position={mesh.position}>
          <mesh>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color={mesh.color} />
          </mesh>
          <Html center>
            <span className="rounded bg-white/90 px-2 py-0.5 text-xs text-slate-700 shadow">{mesh.label}</span>
          </Html>
        </group>
      ))}
    </group>
  )
}

const sensorPositions: Record<Sensor['location'], THREE.Vector3> = {
  DE: new THREE.Vector3(-0.3, 1.2, 0.9),
  NDE: new THREE.Vector3(-4.2, 1.2, -0.9),
  AX: new THREE.Vector3(0, 1.8, 0),
  BASE: new THREE.Vector3(1.8, 0.5, -1.2),
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

function BearingBlocks() {
  return (
    <>
      <mesh position={[-0.6, 0.65, -0.9]} castShadow>
        <boxGeometry args={[0.8, 0.5, 0.6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[1.0, 0.65, 0.9]} castShadow>
        <boxGeometry args={[0.8, 0.5, 0.6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
    </>
  )
}

function BasePlate() {
  return (
    <mesh position={[0, 0.1, 0]} receiveShadow>
      <boxGeometry args={[11, 0.2, 3.4]} />
      <meshStandardMaterial color="#cbd5f5" metalness={0.15} roughness={0.7} />
    </mesh>
  )
}

function FoundationBolts() {
  const bolts = [
    [-4.5, 0.3, -1.4],
    [-4.5, 0.3, 1.4],
    [4.5, 0.3, -1.4],
    [4.5, 0.3, 1.4],
  ]
  return (
    <group>
      {bolts.map(([x, y, z]) => (
        <mesh key={`${x}-${z}`} position={[x, y, z]}>
          <cylinderGeometry args={[0.08, 0.08, 0.6]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      ))}
    </group>
  )
}

const Motor = () => (
  <group>
    <mesh position={[0, -0.45, 0]} castShadow>
      <boxGeometry args={[3.2, 0.4, 1.6]} />
      <meshStandardMaterial color="#1e293b" metalness={0.4} roughness={0.4} />
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.9, 0.9, 2.8, 40, 1, true]} />
      <meshStandardMaterial color="#0ea5e9" metalness={0.5} roughness={0.35} />
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]} castShadow>
      <cylinderGeometry args={[0.95, 0.95, 0.4, 40]} />
      <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 2]} position={[-1.4, 0, 0]} castShadow>
      <cylinderGeometry args={[0.95, 0.95, 0.5, 40]} />
      <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 2]} position={[-1.6, 0, 0]} castShadow>
      <torusGeometry args={[0.6, 0.08, 16, 40]} />
      <meshStandardMaterial color="#f8fafc" metalness={0.3} roughness={0.2} />
    </mesh>
    <mesh position={[0.6, 0.4, -0.7]} castShadow>
      <boxGeometry args={[0.6, 0.4, 0.8]} />
      <meshStandardMaterial color="#0f172a" />
    </mesh>
    {[ -1.2, 1.2 ].map(z => (
      <mesh key={`foot-${z}`} position={[0.4, -0.65, z / 2]} castShadow>
        <boxGeometry args={[0.8, 0.2, 0.4]} />
        <meshStandardMaterial color="#0b1220" metalness={0.3} roughness={0.5} />
      </mesh>
    ))}
    <mesh rotation={[0, 0, Math.PI / 2]} position={[-1.9, 0, 0]} castShadow>
      <cylinderGeometry args={[0.6, 0.6, 0.25, 40]} />
      <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.4} />
    </mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[-1.9, 0.15, 0]} castShadow>
      <torusGeometry args={[0.55, 0.05, 12, 40]} />
      <meshStandardMaterial color="#f87171" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[0.9, 0.2, 0.65]} castShadow>
      <boxGeometry args={[0.35, 0.25, 0.1]} />
      <meshStandardMaterial color="#facc15" />
    </mesh>
  </group>
)

const Pump = () => (
  <group>
    <mesh position={[0, -0.5, 0]} castShadow>
      <boxGeometry args={[2.4, 0.4, 1.6]} />
      <meshStandardMaterial color="#0f172a" metalness={0.4} roughness={0.4} />
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.6, 0, 0]} castShadow>
      <cylinderGeometry args={[0.4, 0.4, 1.2, 32]} />
      <meshStandardMaterial color="#f97316" metalness={0.5} roughness={0.3} />
    </mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0.6, 0.05, 0]} castShadow>
      <torusGeometry args={[0.85, 0.25, 20, 60, Math.PI * 1.25]} />
      <meshStandardMaterial color="#fb923c" metalness={0.4} roughness={0.4} />
    </mesh>
    <mesh position={[1.5, 0.3, 0.5]} castShadow rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.25, 0.25, 1.4, 24]} />
      <meshStandardMaterial color="#f97316" />
    </mesh>
    <mesh position={[0.5, 0.3, -0.9]} castShadow rotation={[0, Math.PI / 2, 0]}>
      <cylinderGeometry args={[0.15, 0.15, 1.8, 24]} />
      <meshStandardMaterial color="#fb923c" />
    </mesh>
    <mesh position={[0.9, 0.15, -0.2]} castShadow rotation={[0, Math.PI / 2, 0]}>
      <torusGeometry args={[0.55, 0.06, 14, 30, Math.PI / 1.2]} />
      <meshStandardMaterial color="#f97316" metalness={0.4} roughness={0.4} />
    </mesh>
    <mesh position={[1.4, 0.3, -0.2]} castShadow rotation={[0, Math.PI / 2, 0]}>
      <cylinderGeometry args={[0.12, 0.12, 1.8, 32]} />
      <meshStandardMaterial color="#f97316" />
    </mesh>
  </group>
)

function Pipework() {
  return (
    <group>
      <mesh position={[2.2, 0.4, 1.5]} castShadow rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.4, 0.08, 16, 30]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-5, 0.9, 0]} castShadow rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 2.4, 24]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  )
}
