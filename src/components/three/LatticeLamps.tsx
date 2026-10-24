"use client";

import "./quiet-three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/*
  Clay oil lamps woven into the site's background lattice. The lattice (.site-bg in globals.css) repeats
  in 4x4 blocks of 64px cells and leaves two cells per block empty, in a diagonal rhythm:
  (col%4 == 0, row%4 == 0) and (col%4 == 2, row%4 == 2). A small terracotta lamp with a live flame sits in
  each of those cells, so lamps and diamond motifs alternate across the whole page.

  Performance: three instanced draws (lamp bodies, glows, flames) for every lamp on screen, orthographic
  camera in CSS pixels, ~24 fps on demand, paused while the page is scrolling.
*/

const TILE = 64;
const LAMP_W = 50;
const LAMP_H = 25;
// spout tip in lamp-quad coordinates (texture is 128x64; tip at x=112, y=27)
const TIP_X = (112 / 128 - 0.5) * LAMP_W;
const TIP_Y = (0.5 - 27 / 64) * LAMP_H;

/** Draws the lamp once onto a canvas: body, filling hole, incised ring, gold zigzag band, spout, handle. */
function makeLampTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.scale(2, 2);

  // soft shadow on the ledge
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath();
  g.ellipse(56, 57, 30, 3.5, 0, 0, Math.PI * 2);
  g.fill();

  // handle loop on the left
  g.strokeStyle = "#7f3f20";
  g.lineWidth = 4;
  g.beginPath();
  g.arc(20, 37, 8, Math.PI * 0.45, Math.PI * 1.6);
  g.stroke();

  // spout
  const spout = g.createLinearGradient(80, 24, 80, 48);
  spout.addColorStop(0, "#c27a4a");
  spout.addColorStop(1, "#5e2b14");
  g.fillStyle = spout;
  g.beginPath();
  g.moveTo(80, 32);
  g.quadraticCurveTo(98, 27, 112, 24);
  g.lineTo(114, 31);
  g.quadraticCurveTo(100, 38, 84, 46);
  g.closePath();
  g.fill();
  g.fillStyle = "#1c0f08";
  g.beginPath();
  g.ellipse(112.5, 27.5, 2.3, 3.4, -0.3, 0, Math.PI * 2);
  g.fill();

  // body, lit from the upper left (and warmly from the flame on the right)
  const body = g.createRadialGradient(44, 30, 4, 54, 40, 38);
  body.addColorStop(0, "#d18a55");
  body.addColorStop(0.5, "#9b5631");
  body.addColorStop(1, "#4a2210");
  g.fillStyle = body;
  g.beginPath();
  g.ellipse(54, 40, 34, 16, 0, 0, Math.PI * 2);
  g.fill();
  const warm = g.createRadialGradient(92, 30, 2, 92, 30, 34);
  warm.addColorStop(0, "rgba(255,170,90,0.45)");
  warm.addColorStop(1, "rgba(255,170,90,0)");
  g.fillStyle = warm;
  g.beginPath();
  g.ellipse(54, 40, 34, 16, 0, 0, Math.PI * 2);
  g.fill();

  // gold zigzag band around the belly
  g.strokeStyle = "rgba(231,205,138,0.75)";
  g.lineWidth = 1.1;
  g.beginPath();
  for (let i = 0; i <= 12; i++) {
    const x = 26 + i * 4.6;
    const y = 43 + (i % 2 ? -2.6 : 2.6) * Math.sin(((x - 20) / 68) * Math.PI);
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();

  // incised ring and filling hole on the shoulder
  g.strokeStyle = "rgba(60,25,10,0.8)";
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(50, 30, 15, 4.6, 0, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "#24120a";
  g.beginPath();
  g.ellipse(50, 30, 7.5, 2.4, 0, 0, Math.PI * 2);
  g.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const vertex = /* glsl */ `
  attribute float aSeed;
  attribute float aDelay;
  varying vec2 vUv;
  varying float vSeed;
  varying float vDelay;
  void main() {
    vUv = uv;
    vSeed = aSeed;
    vDelay = aDelay;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const flameFragment = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vSeed;
  varying float vDelay;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    float lit = smoothstep(vDelay, vDelay + 0.8, uTime);
    vec2 p = vUv - vec2(0.5, 0.1);
    float t = uTime * 2.4 + vSeed * 10.0;
    float n = fbm(vec2(p.x * 3.2, p.y * 3.6 - t));
    float h = clamp(p.y / 0.78, 0.0, 1.0);
    float width = mix(0.3, 0.0, pow(h, 0.75)) * (0.8 + 0.45 * n);
    float sway = (n - 0.5) * 0.16 * h;
    float d = abs(p.x - sway) / max(width, 0.0001);
    float base = smoothstep(-0.03, 0.04, p.y);
    float top = 1.0 - smoothstep(0.62, 1.0, h + (n - 0.5) * 0.35);
    float body = smoothstep(1.0, 0.15, d) * base * top;
    float core = smoothstep(0.5, 0.0, d) * (1.0 - smoothstep(0.12, 0.5, h)) * base;
    vec3 col = mix(vec3(0.75, 0.13, 0.02), vec3(1.0, 0.58, 0.12), smoothstep(0.0, 0.8, body));
    col = mix(col, vec3(1.0, 0.94, 0.72), core);
    gl_FragColor = vec4(col * (1.15 + core * 0.6), clamp(body * 0.95 + core * 0.4, 0.0, 1.0) * lit);
  }
`;

const glowFragment = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vSeed;
  varying float vDelay;
  void main() {
    float lit = smoothstep(vDelay, vDelay + 1.2, uTime);
    float flicker = 0.84 + 0.1 * sin(uTime * 11.3 + vSeed * 6.28) + 0.06 * sin(uTime * 23.7 + vSeed * 3.1);
    float d = length(vUv - 0.5);
    float a = pow(1.0 - smoothstep(0.0, 0.5, d), 2.4) * 0.32 * flicker * lit;
    gl_FragColor = vec4(1.0, 0.55, 0.18, a);
  }
`;

/** Every lamp cell that touches the viewport, in CSS pixels (cell centres). */
function lampCells(width: number, height: number) {
  const out: { x: number; y: number; dist: number }[] = [];
  const cols = Math.ceil(width / TILE) + 1;
  const rows = Math.ceil(height / TILE) + 1;
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      if (!((col % 4 === 0 && row % 4 === 0) || (col % 4 === 2 && row % 4 === 2))) continue;
      const x = TILE / 2 + col * TILE;
      const y = TILE / 2 + row * TILE;
      out.push({ x, y, dist: Math.hypot(x - width / 2, y - height / 2) });
    }
  return out;
}

function Lamps() {
  const { size } = useThree();
  const bodies = useRef<THREE.InstancedMesh>(null);
  const flames = useRef<THREE.InstancedMesh>(null);
  const glows = useRef<THREE.InstancedMesh>(null);
  const texture = useMemo(() => makeLampTexture(), []);
  const cells = useMemo(() => lampCells(size.width, size.height), [size.width, size.height]);
  const n = cells.length;
  const maxDist = useMemo(() => Math.max(1, ...cells.map((c) => c.dist)), [cells]);

  const uniforms = useMemo(() => ({ flame: { uTime: { value: 0 } }, glow: { uTime: { value: 0 } } }), []);
  const attrs = useMemo(() => {
    const seed = new Float32Array(n);
    const delay = new Float32Array(n);
    cells.forEach((c, i) => {
      seed[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      // light up one after another, spreading out from the centre of the screen
      delay[i] = 0.4 + (c.dist / maxDist) * 2.6;
    });
    return { seed: new THREE.InstancedBufferAttribute(seed, 1), delay: new THREE.InstancedBufferAttribute(delay, 1) };
  }, [cells, n, maxDist]);

  useEffect(() => {
    const m = new THREE.Matrix4();
    cells.forEach((c, i) => {
      // CSS px (top-left origin) -> centred orthographic coordinates
      const x = c.x - size.width / 2;
      const y = size.height / 2 - c.y;
      bodies.current!.setMatrixAt(i, m.makeTranslation(x, y - 4, 0));
      flames.current!.setMatrixAt(i, m.makeTranslation(x + TIP_X, y - 4 + TIP_Y + 13.5, 0.2));
      glows.current!.setMatrixAt(i, m.makeTranslation(x + TIP_X - 6, y - 4 + TIP_Y + 6, 0.1));
    });
    for (const mesh of [bodies.current!, flames.current!, glows.current!]) mesh.instanceMatrix.needsUpdate = true;
    flames.current!.geometry.setAttribute("aSeed", attrs.seed);
    flames.current!.geometry.setAttribute("aDelay", attrs.delay);
    glows.current!.geometry.setAttribute("aSeed", attrs.seed);
    glows.current!.geometry.setAttribute("aDelay", attrs.delay);
  }, [cells, size.width, size.height, attrs]);

  useFrame((state) => {
    // R3F copies the uniforms prop onto the material, so write to the material's own copy.
    const t = state.clock.elapsedTime;
    (flames.current!.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    (glows.current!.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
  });

  return (
    <>
      <instancedMesh ref={glows} args={[undefined, undefined, n]} key={`g${n}`} frustumCulled={false}>
        <planeGeometry args={[110, 110]} />
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={glowFragment}
          uniforms={uniforms.glow}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
      <instancedMesh ref={bodies} args={[undefined, undefined, n]} key={`b${n}`} frustumCulled={false}>
        <planeGeometry args={[LAMP_W, LAMP_H]} />
        <meshBasicMaterial map={texture} transparent opacity={0.62} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={flames} args={[undefined, undefined, n]} key={`f${n}`} frustumCulled={false}>
        <planeGeometry args={[19, 28]} />
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={flameFragment}
          uniforms={uniforms.flame}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
    </>
  );
}

/** Renders at a low fixed rate, and holds still while the page scrolls so scrolling gets the whole frame budget. */
function Ticker({ fps = 24 }: { fps?: number }) {
  const { invalidate } = useThree();
  useEffect(() => {
    let lastScroll = 0;
    const onScroll = () => (lastScroll = performance.now());
    window.addEventListener("scroll", onScroll, { passive: true });
    const id = setInterval(() => {
      if (performance.now() - lastScroll > 220 && document.visibilityState === "visible") invalidate();
    }, 1000 / fps);
    return () => {
      clearInterval(id);
      window.removeEventListener("scroll", onScroll);
    };
  }, [invalidate, fps]);
  return null;
}

export default function LatticeLamps() {
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 10], zoom: 1 }}
      dpr={1}
      frameloop="demand"
      gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0 }}
    >
      {!reduce && <Ticker />}
      <Lamps />
    </Canvas>
  );
}
