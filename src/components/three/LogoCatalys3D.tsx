import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Lambang Catalys versi 3D: busur "C", batang pertumbuhan, garis tren,
// panah naik, dan partikel data. Seluruh lambang condong mengikuti kursor.

const TINGGI_BATANG = [0.55, 0.85, 1.12, 1.45];
const LEBAR_BATANG = 0.26;
const JARAK_BATANG = 0.38;
const DASAR_Y = -0.78;
const WARNA_BATANG = ["#012a3d", "#13577d", "#2f6b8f", "#5487ab"];

function xBatang(i: number) {
  return -0.62 + i * JARAK_BATANG;
}

// Silinder tipis yang menghubungkan dua titik (ruas garis tren)
function Ruas({ a, b }: { a: THREE.Vector3; b: THREE.Vector3 }) {
  const { posisi, rotasi, panjang } = useMemo(() => {
    const arah = new THREE.Vector3().subVectors(b, a);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), arah.clone().normalize());
    return {
      posisi: new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5),
      rotasi: new THREE.Euler().setFromQuaternion(q),
      panjang: arah.length(),
    };
  }, [a, b]);
  return (
    <mesh position={posisi} rotation={rotasi}>
      <cylinderGeometry args={[0.022, 0.022, panjang, 8]} />
      <meshStandardMaterial color="#13577d" metalness={0.3} roughness={0.35} />
    </mesh>
  );
}

function Batang({ i, mulai }: { i: number; mulai: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    // tumbuh bergiliran dari bawah
    const t = THREE.MathUtils.clamp((clock.elapsedTime - mulai - i * 0.15) / 0.7, 0, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    ref.current.scale.y = Math.max(ease, 0.001);
  });
  const h = TINGGI_BATANG[i];
  return (
    <group ref={ref} position={[xBatang(i), DASAR_Y, 0]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[LEBAR_BATANG, h, LEBAR_BATANG]} />
        <meshStandardMaterial color={WARNA_BATANG[i]} metalness={0.25} roughness={0.3} />
      </mesh>
    </group>
  );
}

// Posisi partikel dibuat sekali saat modul dimuat, menyebar di cangkang bola
const POSISI_PARTIKEL = (() => {
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

function Partikel() {
  const ref = useRef<THREE.Points>(null);
  const posisi = POSISI_PARTIKEL;
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.06;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[posisi, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#5487ab" size={0.035} sizeAttenuation transparent opacity={0.7} depthWrite={false} />
    </points>
  );
}

function Lambang({ kursor }: { kursor: React.MutableRefObject<{ x: number; y: number }> }) {
  const grup = useRef<THREE.Group>(null);

  const titikTren = useMemo(
    () => TINGGI_BATANG.map((h, i) => new THREE.Vector3(xBatang(i) - 0.12, DASAR_Y + h + 0.32, 0.18)),
    [],
  );
  const lintasPanah = useMemo(
    () =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-1.25, -0.92, 0.3),
        new THREE.Vector3(0.35, -0.75, 0.35),
        new THREE.Vector3(1.55, 0.72, 0.3),
      ),
    [],
  );
  const ujungPanah = useMemo(() => {
    const p = lintasPanah.getPoint(1);
    const arah = lintasPanah.getTangent(1).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), arah);
    return { posisi: p.add(arah.clone().multiplyScalar(0.12)), rotasi: new THREE.Euler().setFromQuaternion(q) };
  }, [lintasPanah]);

  useFrame(({ clock }) => {
    const g = grup.current;
    if (!g) return;
    const t = clock.elapsedTime;
    // muncul membesar, lalu condong mengikuti kursor sambil melayang pelan
    const masuk = THREE.MathUtils.clamp(t / 1.1, 0, 1);
    g.scale.setScalar(1 - Math.pow(1 - masuk, 3));
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, kursor.current.x * 0.55, 0.06);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -kursor.current.y * 0.35, 0.06);
    g.position.y = Math.sin(t * 1.2) * 0.06;
  });

  return (
    <group ref={grup}>
      {/* busur luar dan dalam membentuk huruf C, terbuka ke kanan */}
      <mesh rotation={[0, 0, 0.24 * Math.PI]}>
        <torusGeometry args={[1.38, 0.13, 24, 140, 1.52 * Math.PI]} />
        <meshStandardMaterial color="#0a3f5e" metalness={0.45} roughness={0.25} />
      </mesh>
      <mesh rotation={[0, 0, 0.42 * Math.PI]} position={[0.05, 0, 0.12]}>
        <torusGeometry args={[1.12, 0.045, 16, 120, 1.1 * Math.PI]} />
        <meshStandardMaterial color="#7193ad" metalness={0.3} roughness={0.3} />
      </mesh>

      {TINGGI_BATANG.map((_, i) => (
        <Batang key={i} i={i} mulai={0.5} />
      ))}

      {titikTren.slice(1).map((b, i) => (
        <Ruas key={i} a={titikTren[i]} b={b} />
      ))}
      {titikTren.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.065, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#9cb2c1" emissiveIntensity={0.4} />
        </mesh>
      ))}

      {/* panah pertumbuhan */}
      <mesh>
        <tubeGeometry args={[lintasPanah, 64, 0.075, 12, false]} />
        <meshStandardMaterial color="#2f6b8f" metalness={0.35} roughness={0.25} />
      </mesh>
      <mesh position={ujungPanah.posisi} rotation={ujungPanah.rotasi}>
        <coneGeometry args={[0.2, 0.36, 24]} />
        <meshStandardMaterial color="#5487ab" metalness={0.35} roughness={0.25} />
      </mesh>
    </group>
  );
}

export default function LogoCatalys3D() {
  // posisi kursor di seluruh halaman, dinormalisasi -1..1
  const kursor = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const gerak = (e: PointerEvent) => {
      kursor.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      kursor.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", gerak);
    return () => window.removeEventListener("pointermove", gerak);
  }, []);

  return (
    <Canvas camera={{ position: [0, 0, 5.4], fov: 45 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <pointLight position={[-3, -2, 3]} intensity={12} color="#9cb2c1" />
      <Partikel />
      <Lambang kursor={kursor} />
    </Canvas>
  );
}
