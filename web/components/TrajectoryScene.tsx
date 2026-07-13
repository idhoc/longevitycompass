"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { buildTrajectoryPoints } from "@/lib/trajectoryCurve";

const VERTEX_SHADER = `
  uniform float uTime;
  varying float vT;
  varying vec3 vNormalView;

  void main() {
    // TubeGeometry UVs: u wraps the radial cross-section, v runs along the
    // tube's length — the length-wise position is uv.y, not uv.x.
    vT = uv.y;
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uColorStart;
  uniform vec3 uColorEnd;
  uniform float uTime;
  uniform float uReach;
  varying float vT;
  varying vec3 vNormalView;

  void main() {
    bool reached = vT <= uReach;
    float withinReach = clamp(vT / max(uReach, 0.001), 0.0, 1.0);
    vec3 gradColor = mix(uColorStart, uColorEnd, withinReach);

    // a slow traveling band of brightness, reading as a live signal moving
    // along the curve rather than a static gradient
    float travel = smoothstep(0.0, 0.16, 0.16 - abs(fract(vT - uTime * 0.12) - 0.5) * 2.0 + 0.34);
    float pulse = smoothstep(0.0, 1.0, sin(vT * 40.0 - uTime * 1.6) * 0.5 + 0.5) * 0.08;
    float fresnel = pow(1.0 - clamp(abs(vNormalView.z), 0.0, 1.0), 2.2);

    vec3 activeColor = gradColor + fresnel * 0.5 + travel * 0.35 + pulse;
    vec3 fadedColor = mix(uColorStart, vec3(0.72, 0.70, 0.63), 0.72);

    vec3 col = reached ? activeColor : fadedColor;
    float alpha = reached ? 0.94 : 0.2;
    gl_FragColor = vec4(col, alpha);
  }
`;

function TrajectoryTube({
  reach,
  colorStart,
  colorEnd,
  radius,
}: {
  reach: number;
  colorStart: string;
  colorEnd: string;
  radius: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const points = useMemo(() => buildTrajectoryPoints(1), []);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);
  const geometry = useMemo(
    () => new THREE.TubeGeometry(curve, 220, radius, 14, false),
    [curve, radius]
  );

  // `reach` deliberately isn't a dependency here: this only sets the
  // *starting* uniform value the first time the material is built, then
  // useFrame below eases uReach.value toward the current `reach` prop on
  // every frame. Adding `reach` here would recreate the uniforms object
  // (and the material's GPU state with it) on every change, snapping
  // instead of easing.
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReach: { value: reach },
      uColorStart: { value: new THREE.Color(colorStart) },
      uColorEnd: { value: new THREE.Color(colorEnd) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colorStart, colorEnd]
  );

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
      materialRef.current.uniforms.uReach.value +=
        (reach - materialRef.current.uniforms.uReach.value) * Math.min(1, delta * 1.5);
    }
  });

  // Clip the tube geometry visually by discarding past `reach` — simplest
  // robust approach for a static TubeGeometry: draw the full tube, but our
  // fragment shader edge-fades right at uReach, and we additionally scale
  // draw range isn't trivial per-vertex here, so we accept the shader-based
  // brightness falloff past reach as the "faint, not yet earned" segment.
  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
      />
    </mesh>
  );
}

function Baseline({ width }: { width: number }) {
  // Built as a real THREE.Line object and rendered via `primitive`, rather
  // than the `<line>` JSX intrinsic — React 19's revised JSX namespace
  // merging resolves `<line>` to the SVG element's types here instead of
  // @react-three/fiber's augmented intrinsic, so this sidesteps that clash.
  const lineObject = useMemo(() => {
    const points = [new THREE.Vector3(-width / 2, -0.62, 0), new THREE.Vector3(width / 2, -0.62, 0)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: "#c3baa4", transparent: true, opacity: 0.5 });
    return new THREE.Line(geometry, material);
  }, [width]);

  return <primitive object={lineObject} />;
}

function InteractiveGroup({
  interactive,
  children,
}: {
  interactive: boolean;
  children: React.ReactNode;
}) {
  const { pointer } = useThree();
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!group.current) return;
    const targetY = interactive ? pointer.x * 0.18 : 0;
    const targetX = (interactive ? -pointer.y * 0.06 : 0) + 0.08;
    group.current.rotation.y += (targetY - group.current.rotation.y) * Math.min(1, delta * 1.4);
    group.current.rotation.x += (targetX - group.current.rotation.x) * Math.min(1, delta * 1.4);
  });
  return <group ref={group}>{children}</group>;
}

export function TrajectoryScene({
  reach = 1,
  interactive = true,
  radius = 0.05,
  colorStart = "#8b8d7e",
  colorEnd = "#3e6b4f",
  className,
}: {
  reach?: number;
  interactive?: boolean;
  radius?: number;
  colorStart?: string;
  colorEnd?: string;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.4, 6.4], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 4, 5]} intensity={0.6} />
        <InteractiveGroup interactive={interactive}>
          <TrajectoryTube reach={reach} colorStart={colorStart} colorEnd={colorEnd} radius={radius} />
          <Baseline width={8} />
        </InteractiveGroup>
      </Canvas>
    </div>
  );
}
