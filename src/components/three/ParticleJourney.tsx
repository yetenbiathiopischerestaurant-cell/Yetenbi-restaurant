"use client";

import "./quiet-three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Shape samplers - each returns `count` xyz points                   */
/* ------------------------------------------------------------------ */

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Spiral galaxy of "beans" with three arms. */
function galaxy(count: number) {
  const r = rng(11);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const radius = Math.pow(r(), 1.6) * 6.5;
    const arm = (Math.floor(r() * 3) / 3) * Math.PI * 2;
    const angle = arm + radius * 0.75;
    const spread = (1 - radius / 7) * 0.12 + 0.08;
    out[i * 3] = Math.cos(angle) * radius + (r() - 0.5) * spread * radius;
    out[i * 3 + 1] = (r() - 0.5) * 0.5 * (1.2 - radius / 6.5);
    out[i * 3 + 2] = Math.sin(angle) * radius + (r() - 0.5) * spread * radius;
  }
  return out;
}

/** One giant coffee bean, crease and all. */
function bean(count: number) {
  const r = rng(23);
  const out = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    if (r() < 0.14) {
      const y = r() * 1.84 - 0.92;
      const x = 0.09 * Math.sin(y * 2.6);
      const z = Math.sqrt(Math.max(0, 1 - y * y - x * x)) * 0.4;
      out[i * 3] = x * 2.0;
      out[i * 3 + 1] = y * 3.0;
      out[i * 3 + 2] = z * 1.5;
      continue;
    }
    v.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();
    if (v.z > 0) {
      const c = 0.09 * Math.sin(v.y * 2.6);
      const d = (v.x - c) / 0.13;
      v.z -= 0.6 * Math.exp(-d * d) * v.z;
    }
    const shell = 0.99 + r() * 0.02;
    out[i * 3] = v.x * 2.0 * shell;
    out[i * 3 + 1] = v.y * 3.0 * shell;
    out[i * 3 + 2] = v.z * 1.5 * shell;
  }
  return out;
}

/** Jebena silhouette: lathe body, neck, spout and handle. */
function jebena(count: number) {
  const r = rng(37);
  const out = new Float32Array(count * 3);
  const profile = new THREE.SplineCurve([
    new THREE.Vector2(0.42, 0.02),
    new THREE.Vector2(0.95, 0.45),
    new THREE.Vector2(1.08, 0.85),
    new THREE.Vector2(0.95, 1.25),
    new THREE.Vector2(0.55, 1.6),
    new THREE.Vector2(0.24, 1.85),
    new THREE.Vector2(0.18, 2.3),
    new THREE.Vector2(0.17, 2.75),
    new THREE.Vector2(0.33, 3.05),
  ]);
  const spout = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.82, 1.1, 0),
    new THREE.Vector3(1.15, 1.45, 0),
    new THREE.Vector3(1.32, 1.95, 0),
    new THREE.Vector3(1.48, 2.3, 0),
  ]);
  const handle = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.17, 2.45, 0),
    new THREE.Vector3(-0.7, 2.35, 0),
    new THREE.Vector3(-1.05, 1.75, 0),
    new THREE.Vector3(-0.98, 1.15, 0),
  ]);
  const rings: [number, number][] = [
    [0.43, 0.03],
    [1.08, 0.85],
    [0.8, 1.42],
    [0.18, 2.6],
    [0.33, 3.05],
  ];
  const scale = 1.7;
  for (let i = 0; i < count; i++) {
    const pick = r();
    let x: number, y: number, z: number;
    if (pick < 0.16) {
      const [ringR, ringY] = rings[Math.floor(r() * rings.length)];
      const a = r() * Math.PI * 2;
      x = Math.cos(a) * ringR;
      z = Math.sin(a) * ringR;
      y = ringY;
    } else if (pick < 0.84) {
      const p = profile.getPoint(r());
      const a = r() * Math.PI * 2;
      x = Math.cos(a) * p.x;
      z = Math.sin(a) * p.x;
      y = p.y;
    } else {
      const curve = pick < 0.93 ? spout : handle;
      const p = curve.getPoint(r());
      const a = r() * Math.PI * 2;
      const rad = pick < 0.93 ? 0.09 : 0.07;
      x = p.x + Math.cos(a) * rad;
      y = p.y + Math.sin(a) * rad;
      z = p.z + Math.sin(a + 1.3) * rad;
    }
    out[i * 3] = x * scale;
    out[i * 3 + 1] = (y - 1.5) * scale;
    out[i * 3 + 2] = z * scale;
  }
  return out;
}

/* The site's muted flag palette, as raw sRGB (the shader writes colours straight to the screen). */
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const FLAG_GREEN = hex("#4f8a5f");
const FLAG_GOLD = hex("#e2bf62");
const FLAG_RED = hex("#b0402c");
// The dark disc is lifted a little, or its sparse dots disappear against the black backdrop.
const EMBLEM_BLUE = hex("#2f4470").map((v) => v * 1.45);
const EMBLEM_STAR = hex("#f0d78f");

/**
 * The Ethiopian flag (2:1): green, gold and red stripes with the blue emblem disc, its five-pointed
 * star outline and rays. Flat on z=0; the shader makes the cloth wave. Also returns each point's colour.
 */
function flag(count: number) {
  const r = rng(61);
  const out = new Float32Array(count * 3);
  const colour = new Float32Array(count * 3);
  const W = 7;
  const H = 3.5;
  const disc = H * 0.31;
  const tip = disc * 0.8;
  const notch = tip * 0.382; // radius of the star's inner corners

  // Star outline (each tip joined to the tip two along) plus a ray out of every notch: [x0, y0, x1, y1, half width].
  const lines: number[][] = [];
  for (let k = 0; k < 5; k++) {
    const a = Math.PI / 2 + (k * Math.PI * 2) / 5;
    const b = a + (Math.PI * 4) / 5;
    lines.push([Math.cos(a) * tip, Math.sin(a) * tip, Math.cos(b) * tip, Math.sin(b) * tip, 0.045]);
    const g = a + Math.PI / 5;
    lines.push([Math.cos(g) * notch * 1.2, Math.sin(g) * notch * 1.2, Math.cos(g) * tip, Math.sin(g) * tip, 0.03]);
  }
  const lengths = lines.map(([x0, y0, x1, y1]) => Math.hypot(x1 - x0, y1 - y0));
  const total = lengths.reduce((s, l) => s + l, 0);

  const onEmblem = (x: number, y: number) =>
    lines.some(([x0, y0, x1, y1, w]) => {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(x - x0 - dx * t, y - y0 - dy * t) < w;
    });
  const pick = (x: number, y: number) => {
    if (x * x + y * y < disc * disc) return onEmblem(x, y) ? EMBLEM_STAR : EMBLEM_BLUE;
    return y > H / 6 ? FLAG_GREEN : y < -H / 6 ? FLAG_RED : FLAG_GOLD;
  };

  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    const q = r();
    if (q < 0.1) {
      // Extra points inside the emblem disc so the dark blue reads as a solid disc.
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * disc;
      x = Math.cos(a) * d;
      y = Math.sin(a) * d;
    } else if (q < 0.22) {
      // Extra points along the star and rays, weighted by length, so the thin outline reads crisply.
      let d = r() * total;
      let j = 0;
      while (j < lines.length - 1 && d > lengths[j]) d -= lengths[j++];
      const [x0, y0, x1, y1] = lines[j];
      const t = r();
      x = x0 + (x1 - x0) * t + (r() - 0.5) * 0.03;
      y = y0 + (y1 - y0) * t + (r() - 0.5) * 0.03;
    } else {
      x = (r() - 0.5) * W;
      y = (r() - 0.5) * H;
    }
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = (r() - 0.5) * 0.05;
    colour.set(pick(x, y), i * 3);
  }
  return { points: out, colour };
}

/** The word YETENBI, sampled from canvas pixels and given a little depth. */
function word(count: number, family: string) {
  const r = rng(53);
  const W = 1400;
  const H = 360;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 280px ${family}`;
  ctx.fillText("YETENBI", W / 2, H / 2 + 10);
  const data = ctx.getImageData(0, 0, W, H).data;
  const pts: number[] = [];
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 128) pts.push(x, y);
  const out = new Float32Array(count * 3);
  const n = pts.length / 2;
  for (let i = 0; i < count; i++) {
    const k = Math.floor(r() * n) * 2;
    out[i * 3] = ((pts[k] + r() * 2) / W - 0.5) * 12.5;
    out[i * 3 + 1] = (-((pts[k + 1] + r() * 2) / H - 0.5) * (12.5 * H)) / W;
    out[i * 3 + 2] = (r() - 0.5) * 0.1;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Shader                                                              */
/* ------------------------------------------------------------------ */

const vertex = /* glsl */ `
  uniform float uStage;
  uniform float uTime;
  uniform float uScatter;
  uniform float uPixel;
  uniform float uFit;
  attribute vec3 aFlag;
  attribute vec3 aFlagColor;
  attribute vec3 aP1;
  attribute vec3 aP2;
  attribute vec3 aP3;
  attribute vec4 aRand;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDepth;

  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

  void main() {
    // The flag waves like cloth: a wave runs along x, growing toward the free (right) edge.
    vec3 pf = aFlag;
    float wave = aFlag.x * 1.15 - uTime * 2.2;
    float amp = 0.1 + 0.035 * (aFlag.x + 3.5);
    pf.z += sin(wave) * amp;
    pf.y += sin(wave * 0.8 + 1.3) * amp * 0.25;

    // Galaxy spins faster toward its core.
    vec3 p0 = position;
    p0.xz = rot(uTime * (0.08 + 0.35 / (1.0 + length(position.xz)))) * p0.xz;
    p0.yz = rot(1.05) * p0.yz;

    // Stages: 0 flag, 1 galaxy, 2 bean, 3 jebena, 4 word.
    // Each particle runs a little ahead or behind; not yet while the flag holds, so its star stays crisp.
    float l = clamp(uStage + (aRand.x - 0.5) * 0.22 * smoothstep(0.0, 0.3, uStage), 0.0, 4.0);
    float k0 = smoothstep(0.0, 1.0, clamp(l, 0.0, 1.0));
    float k1 = smoothstep(0.0, 1.0, clamp(l - 1.0, 0.0, 1.0));
    float k2 = smoothstep(0.0, 1.0, clamp(l - 2.0, 0.0, 1.0));
    float k3 = smoothstep(0.0, 1.0, clamp(l - 3.0, 0.0, 1.0));
    vec3 pos = mix(mix(mix(mix(pf, p0, k0), aP1, k1), aP2, k2), aP3, k3);

    // Turbulence peaks mid-morph so shapes dissolve into swirling smoke.
    float mid = sin(fract(l) * 3.14159) * step(0.001, l) * step(l, 3.999);
    vec3 swirl = vec3(
      sin(pos.y * 1.7 + uTime * 1.3 + aRand.y * 6.28),
      cos(pos.x * 1.3 + uTime * 1.1 + aRand.z * 6.28),
      sin(pos.x * 1.1 + pos.y * 0.7 + uTime)
    );
    pos += swirl * mid * 0.55;

    // Idle shimmer.
    pos += 0.01 * vec3(sin(uTime * 2.0 + aRand.w * 40.0), cos(uTime * 1.7 + aRand.y * 40.0), 0.0);

    pos *= uFit;

    // Scatter: the dust flies in to form the flag at the start and explodes outward at the end.
    vec3 dir = normalize(vec3(aRand.y - 0.5, aRand.z - 0.5, aRand.w - 0.5) + 0.0001);
    pos += dir * uScatter * (6.0 + aRand.x * 10.0);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    // Flag points are a touch larger so the stripes read as cloth, not scattered dust.
    float size = (0.55 + aRand.y * 1.05) * (1.0 + mid * 0.9) * (1.0 + 0.35 * (1.0 - k0));
    gl_PointSize = size * uPixel * (14.0 / -mv.z);

    vec3 gold = vec3(0.91, 0.76, 0.42);
    vec3 cream = vec3(1.0, 0.94, 0.82);
    vec3 ember = vec3(0.95, 0.42, 0.14);
    vColor = mix(gold, aRand.z > 0.82 ? ember : cream, smoothstep(0.35, 1.0, aRand.z));
    // Flag colours only while the flag is formed; the folds catch the light a little. The muted palette is
    // lifted slightly: points rarely overlap here, so additive blending doesn't wash it out but dims it.
    vec3 cloth = aFlagColor * (1.13 + 0.27 * cos(wave));
    vColor = mix(vColor, cloth, 1.0 - k0);
    vAlpha = (0.85 + aRand.w * 0.4) * (1.0 - uScatter * 0.9);
    // Points on the far side of a shape fade, so its volume and outline read clearly.
    vDepth = smoothstep(-15.0, -8.5, mv.z);
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDepth;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.12, d);
    gl_FragColor = vec4(vColor * mix(0.55, 1.15, vDepth), a * vAlpha * mix(0.25, 1.0, vDepth));
  }
`;

/* ------------------------------------------------------------------ */

/*
  Timeline as a share of the intro (16 s, see Intro.tsx): the dust gathers into the flag by GATHER,
  then each [start, end] pair morphs to the next shape (flag → galaxy → bean → jebena → word),
  with a hold in between, and everything explodes outward after EXPLODE. Captions in Intro.tsx follow these.
*/
const GATHER = 0.05;
const MORPHS = [
  [0.16, 0.24],
  [0.32, 0.4],
  [0.505, 0.585],
  [0.69, 0.77],
] as const;
const EXPLODE = 0.89;

function Particles({
  progress,
  count,
  family,
  onReady,
}: {
  progress: MotionValue<number>;
  count: number;
  family: string;
  onReady?: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const { size, gl } = useThree();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const f = flag(count);
    g.setAttribute("aFlag", new THREE.BufferAttribute(f.points, 3));
    g.setAttribute("aFlagColor", new THREE.BufferAttribute(f.colour, 3));
    g.setAttribute("position", new THREE.BufferAttribute(galaxy(count), 3));
    g.setAttribute("aP1", new THREE.BufferAttribute(bean(count), 3));
    g.setAttribute("aP2", new THREE.BufferAttribute(jebena(count), 3));
    g.setAttribute("aP3", new THREE.BufferAttribute(word(count, family), 3));
    const r = rng(71);
    const rand = new Float32Array(count * 4).map(() => r());
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
    return g;
  }, [count, family]);

  const uniforms = useMemo(
    () => ({
      uStage: { value: 0 },
      uTime: { value: 0 },
      // Starts fully scattered, so the dust gathers into the flag.
      uScatter: { value: 1 },
      uPixel: { value: 1 },
      uFit: { value: 1 },
    }),
    [],
  );

  const material = useRef<THREE.ShaderMaterial>(null);
  const announced = useRef(false);
  const spin = useRef(0);

  useFrame((_, delta) => {
    // R3F copies the uniforms prop onto the material, so update the material's own copy.
    const u = material.current!.uniforms;
    if (!announced.current) {
      announced.current = true;
      onReady?.();
    }
    const p = progress.get();
    const stage = MORPHS.reduce((s, [a, b]) => s + THREE.MathUtils.clamp((p - a) / (b - a), 0, 1), 0);
    const gather = 1 - THREE.MathUtils.smoothstep(p, 0, GATHER);
    const explode = Math.max(0, (p - EXPLODE) / (1 - EXPLODE));
    u.uStage.value = THREE.MathUtils.lerp(u.uStage.value, stage, 0.11);
    u.uScatter.value = THREE.MathUtils.lerp(u.uScatter.value, Math.max(gather, explode), 0.1);
    u.uTime.value += delta;
    u.uPixel.value = gl.getPixelRatio();
    u.uFit.value = Math.min(1, size.width / size.height / 1.45) * 0.95 + 0.05;

    // The flag and the word face the camera; the shapes in between turn slowly, then ease back to the front.
    const facing = Math.max(
      1 - THREE.MathUtils.smoothstep(u.uStage.value, 0.1, 0.8),
      THREE.MathUtils.smoothstep(u.uStage.value, 3.2, 3.9),
    );
    spin.current += delta * 0.3 * (1 - facing);
    const front = Math.round(spin.current / (Math.PI * 2)) * Math.PI * 2;
    group.current!.rotation.y = THREE.MathUtils.lerp(spin.current, front, facing);
  });

  return (
    <group ref={group}>
      <points geometry={geometry}>
        <shaderMaterial
          ref={material}
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

export default function ParticleJourney({
  progress,
  active,
  onReady,
}: {
  progress: MotionValue<number>;
  active: boolean;
  onReady?: () => void;
}) {
  const [family, setFamily] = useState<string | null>(null);
  const [count, setCount] = useState(16000);

  useEffect(() => {
    const cs = getComputedStyle(document.documentElement).getPropertyValue("--font-cormorant").trim();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(window.innerWidth < 768 ? 6500 : 16000);
    document.fonts.ready.then(() => setFamily(cs || "Georgia, serif"));
  }, []);

  if (!family) return null;

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 11], fov: 45 }}
      gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
    >
      <Particles progress={progress} count={count} family={family} onReady={onReady} />
    </Canvas>
  );
}
