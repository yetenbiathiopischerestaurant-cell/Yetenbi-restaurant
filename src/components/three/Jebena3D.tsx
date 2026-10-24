"use client";

import "./quiet-three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useNearViewport } from "./useInView";

/** Clay jebena built from a lathe profile, a curved spout and a looped handle. */
function Pot() {
  const group = useRef<THREE.Group>(null);

  const body = useMemo(() => {
    const curve = new THREE.SplineCurve([
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.42, 0.02),
      new THREE.Vector2(0.5, 0.12),
      new THREE.Vector2(0.95, 0.45),
      new THREE.Vector2(1.08, 0.85),
      new THREE.Vector2(0.95, 1.25),
      new THREE.Vector2(0.55, 1.6),
      new THREE.Vector2(0.24, 1.85),
      new THREE.Vector2(0.18, 2.3),
      new THREE.Vector2(0.17, 2.75),
      new THREE.Vector2(0.24, 2.95),
      new THREE.Vector2(0.33, 3.05),
    ]);
    return new THREE.LatheGeometry(curve.getPoints(80), 96);
  }, []);

  const spout = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.82, 1.1, 0),
          new THREE.Vector3(1.15, 1.45, 0),
          new THREE.Vector3(1.32, 1.95, 0),
          new THREE.Vector3(1.48, 2.3, 0),
        ]),
        40,
        0.085,
        16,
      ),
    [],
  );

  const handle = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.17, 2.45, 0),
          new THREE.Vector3(-0.7, 2.35, 0),
          new THREE.Vector3(-1.05, 1.75, 0),
          new THREE.Vector3(-0.98, 1.15, 0),
        ]),
        40,
        0.07,
        12,
      ),
    [],
  );

  useFrame((state, delta) => {
    const g = group.current!;
    g.rotation.y += delta * 0.35;
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, state.pointer.y * 0.2, 0.05);
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, -state.pointer.x * 0.12, 0.05);
    g.position.y = -1.45 + Math.sin(state.clock.elapsedTime * 1.1) * 0.08;
  });

  return (
    <group ref={group}>
      <mesh geometry={body}>
        <meshPhysicalMaterial
          color="#2e1b11"
          roughness={0.42}
          metalness={0.05}
          clearcoat={0.6}
          clearcoatRoughness={0.35}
        />
      </mesh>
      <mesh geometry={spout}>
        <meshPhysicalMaterial color="#2e1b11" roughness={0.42} clearcoat={0.6} />
      </mesh>
      <mesh geometry={handle}>
        <meshPhysicalMaterial color="#2e1b11" roughness={0.42} clearcoat={0.6} />
      </mesh>
      {/* Gold bands, echoing the painted rims of a traditional jebena */}
      {[
        [1.075, 0.85],
        [0.82, 1.38],
        [0.2, 2.6],
      ].map(([r, y]) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.022, 12, 120]} />
          <meshStandardMaterial color="#e7cd8a" metalness={1} roughness={0.25} />
        </mesh>
      ))}
      <Steam />
    </group>
  );
}

/** Soft additive particles rising from the spout. */
function Steam({ count = 70 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,240,215,1)");
    grad.addColorStop(1, "rgba(255,240,215,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);

  const { positions, life } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const life = new Float32Array(count).map(() => Math.random());
    return { positions, life };
  }, [count]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      life[i] += delta * 0.28;
      if (life[i] > 1) life[i] = 0;
      const l = life[i];
      positions[i * 3] = 1.5 + Math.sin(t * 1.5 + i) * 0.12 * l + l * 0.35;
      positions[i * 3 + 1] = 2.35 + l * 2.2;
      positions[i * 3 + 2] = Math.cos(t + i * 1.7) * 0.15 * l;
    }
    points.current!.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        size={0.38}
        transparent
        opacity={0.22}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#fff1d6"
      />
    </points>
  );
}

export default function Jebena3D({ className = "" }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const near = useNearViewport(wrap);

  return (
    <div ref={wrap} className={className} aria-hidden>
      <Canvas
        frameloop={near ? "always" : "never"}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.4, 6.2], fov: 38 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.25} />
        <directionalLight position={[4, 5, 5]} intensity={2.6} color="#ffe2b0" />
        <pointLight position={[-4, 2, -2]} intensity={40} color="#c9a24a" />
        <pointLight position={[3, -3, 3]} intensity={14} color="#e2662a" />
        <spotLight position={[0, 6, 2]} angle={0.5} penumbra={1} intensity={30} color="#fff3dd" />
        <Pot />
      </Canvas>
    </div>
  );
}
