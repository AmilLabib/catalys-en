import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// 3D version of the Catalys emblem: a "C" arc, growth bars, a trend line,
// an upward arrow, and data particles. The whole emblem tilts toward the cursor.

const BAR_HEIGHTS = [0.55, 0.85, 1.12, 1.45];
const BAR_WIDTH = 0.26;
const BAR_SPACING = 0.38;
const BASE_Y = -0.78;
const BAR_COLORS = ["#012a3d", "#13577d", "#2f6b8f", "#5487ab"];

function barX(i: number) {
  return -0.62 + i * BAR_SPACING;
}

// Thin cylinder connecting two points (a trend line segment)
function Segment({ a, b }: { a: THREE.Vector3; b: THREE.Vector3 }) {
  const { position, rotation, length } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return {
      position: new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5),
      rotation: new THREE.Euler().setFromQuaternion(q),
      length: dir.length(),
    };
  }, [a, b]);
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[0.022, 0.022, length, 8]} />
      <meshStandardMaterial color="#13577d" metalness={0.3} roughness={0.35} />
    </mesh>
  );
}

function Bar({ i, start }: { i: number; start: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    // grow in turn from the bottom
    const t = THREE.MathUtils.clamp((clock.elapsedTime - start - i * 0.15) / 0.7, 0, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    ref.current.scale.y = Math.max(ease, 0.001);
  });
  const h = BAR_HEIGHTS[i];
  return (
    <group ref={ref} position={[barX(i), BASE_Y, 0]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[BAR_WIDTH, h, BAR_WIDTH]} />
        <meshStandardMaterial color={BAR_COLORS[i]} metalness={0.25} roughness={0.3} />
      </mesh>
    </group>
  );
}

// Particle positions are created once when the module loads, spread over a spherical shell
const PARTICLE_POSITIONS = (() => {
  const n = 420;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 1.9 + Math.random() * 1.8;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    arr[i * 3] = r * Math.sin(ph) * Math.cos(th);
    arr[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.7;
    arr[i * 3 + 2] = r * Math.cos(ph) * 0.6;
  }
  return arr;
})();

function Particles() {
  const ref = useRef<THREE.Points>(null);
  const positions = PARTICLE_POSITIONS;
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.06;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#5487ab" size={0.035} sizeAttenuation transparent opacity={0.7} depthWrite={false} />
    </points>
  );
}

function Emblem({ cursor }: { cursor: React.MutableRefObject<{ x: number; y: number }> }) {
  const group = useRef<THREE.Group>(null);

  const trendPoints = useMemo(
    () => BAR_HEIGHTS.map((h, i) => new THREE.Vector3(barX(i) - 0.12, BASE_Y + h + 0.32, 0.18)),
    [],
  );
  const arrowPath = useMemo(
    () =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-1.25, -0.92, 0.3),
        new THREE.Vector3(0.35, -0.75, 0.35),
        new THREE.Vector3(1.55, 0.72, 0.3),
      ),
    [],
  );
  const arrowHead = useMemo(() => {
    const p = arrowPath.getPoint(1);
    const dir = arrowPath.getTangent(1).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return { position: p.add(dir.clone().multiplyScalar(0.12)), rotation: new THREE.Euler().setFromQuaternion(q) };
  }, [arrowPath]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    // scale in, then tilt toward the cursor while floating gently
    const enter = THREE.MathUtils.clamp(t / 1.1, 0, 1);
    g.scale.setScalar(1 - Math.pow(1 - enter, 3));
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, cursor.current.x * 0.55, 0.06);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -cursor.current.y * 0.35, 0.06);
    g.position.y = Math.sin(t * 1.2) * 0.06;
  });

  return (
    <group ref={group}>
      {/* outer and inner arcs form the letter C, open to the right */}
      <mesh rotation={[0, 0, 0.24 * Math.PI]}>
        <torusGeometry args={[1.38, 0.13, 24, 140, 1.52 * Math.PI]} />
        <meshStandardMaterial color="#0a3f5e" metalness={0.45} roughness={0.25} />
      </mesh>
      <mesh rotation={[0, 0, 0.42 * Math.PI]} position={[0.05, 0, 0.12]}>
        <torusGeometry args={[1.12, 0.045, 16, 120, 1.1 * Math.PI]} />
        <meshStandardMaterial color="#7193ad" metalness={0.3} roughness={0.3} />
      </mesh>

      {BAR_HEIGHTS.map((_, i) => (
        <Bar key={i} i={i} start={0.5} />
      ))}

      {trendPoints.slice(1).map((b, i) => (
        <Segment key={i} a={trendPoints[i]} b={b} />
      ))}
      {trendPoints.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.065, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#9cb2c1" emissiveIntensity={0.4} />
        </mesh>
      ))}

      {/* growth arrow */}
      <mesh>
        <tubeGeometry args={[arrowPath, 64, 0.075, 12, false]} />
        <meshStandardMaterial color="#2f6b8f" metalness={0.35} roughness={0.25} />
      </mesh>
      <mesh position={arrowHead.position} rotation={arrowHead.rotation}>
        <coneGeometry args={[0.2, 0.36, 24]} />
        <meshStandardMaterial color="#5487ab" metalness={0.35} roughness={0.25} />
      </mesh>
    </group>
  );
}

export default function LogoCatalys3D() {
  // cursor position across the whole page, normalized to -1..1
  const cursor = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      cursor.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      cursor.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return (
    <Canvas camera={{ position: [0, 0, 5.4], fov: 45 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <pointLight position={[-3, -2, 3]} intensity={12} color="#9cb2c1" />
      <Particles />
      <Emblem cursor={cursor} />
    </Canvas>
  );
}
