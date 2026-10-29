import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Maximize2, Crosshair } from "lucide-react";

// 3D map of Indonesia. Each branch stands as a pillar as tall as its share
// of revenue. The camera opens on the whole archipelago, then glides to the branches.

export type BranchPoint = {
  name: string;
  lon: number;
  lat: number;
  share: number; // 0..1, revenue share of the branch total
  label: string; // small text under the name, e.g. "Rp 1,2 B"
  color: string;
};

type Point = [number, number]; // [longitude, latitude]

// Simplified coastlines. Kalimantan, Timor, and Papua show only the Indonesian part.
const ISLANDS: { name?: string; center?: Point; outline: Point[] }[] = [
  {
    name: "Sumatra",
    center: [101.6, -0.6],
    outline: [
      [95.2, 5.6], [95.9, 5.5], [97.5, 5.2], [98.3, 4.2], [99.0, 3.6], [100.0, 2.6], [100.9, 2.0], [101.4, 1.7],
      [102.2, 1.2], [103.1, 0.5], [103.8, 0.0], [103.6, -0.8], [104.4, -1.1], [104.6, -1.9], [105.2, -2.3],
      [105.8, -2.9], [106.0, -3.3], [105.9, -4.3], [105.9, -5.7], [105.6, -5.85], [105.2, -5.6], [104.6, -5.9],
      [104.5, -5.6], [103.9, -5.0], [102.9, -4.2], [102.3, -3.6], [101.4, -2.8], [100.9, -2.1], [100.4, -1.1],
      [99.8, -0.2], [99.3, 0.4], [98.8, 1.5], [98.3, 2.2], [97.6, 2.9], [97.1, 3.7], [96.4, 4.3], [95.6, 4.8], [95.2, 5.3],
    ],
  },
  { outline: [[105.1, -1.6], [105.8, -1.5], [106.3, -2.2], [106.8, -3.0], [106.1, -3.1], [105.4, -2.4]] }, // Bangka
  { outline: [[107.6, -2.6], [108.3, -2.6], [108.3, -3.2], [107.6, -3.2]] }, // Belitung
  {
    name: "Java",
    center: [110.2, -7.35],
    outline: [
      [105.22, -6.82], [105.6, -6.4], [105.95, -5.95], [106.4, -6.0], [106.75, -6.08], [107.1, -5.98],
      [107.5, -6.05], [107.95, -6.25], [108.32, -6.22], [108.6, -6.72], [109.1, -6.84], [109.68, -6.86],
      [110.15, -6.92], [110.42, -6.95], [110.62, -6.62], [110.72, -6.42], [111.05, -6.5], [111.45, -6.68],
      [112.0, -6.86], [112.55, -6.88], [112.78, -7.18], [112.92, -7.58], [113.45, -7.72], [113.95, -7.68],
      [114.38, -7.78], [114.45, -8.15], [114.42, -8.72], [113.85, -8.45], [113.25, -8.3], [112.6, -8.42],
      [111.85, -8.3], [111.05, -8.22], [110.32, -8.02], [109.55, -7.8], [109.0, -7.74], [108.5, -7.82],
      [107.85, -7.64], [107.05, -7.42], [106.45, -7.02], [105.85, -6.86],
    ],
  },
  { outline: [[112.7, -6.9], [113.5, -6.88], [114.1, -6.95], [113.9, -7.15], [113.0, -7.2], [112.75, -7.1]] }, // Madura
  { outline: [[114.55, -8.1], [114.9, -8.1], [115.2, -8.05], [115.7, -8.35], [115.5, -8.65], [115.2, -8.8], [115.1, -8.6], [114.6, -8.4]] }, // Bali
  { outline: [[115.85, -8.25], [116.4, -8.2], [116.7, -8.5], [116.5, -8.9], [116.0, -8.9], [115.85, -8.7]] }, // Lombok
  {
    outline: [
      [116.8, -8.5], [117.2, -8.35], [117.8, -8.1], [118.3, -8.3], [118.8, -8.2], [119.1, -8.5], [118.9, -8.8],
      [118.2, -8.8], [117.6, -9.0], [117.1, -8.95], [116.8, -8.8],
    ],
  }, // Sumbawa
  {
    outline: [
      [119.8, -8.5], [120.5, -8.3], [121.3, -8.45], [122.0, -8.4], [122.9, -8.1], [123.0, -8.4], [122.3, -8.7],
      [121.5, -8.85], [120.6, -8.85], [119.9, -8.8],
    ],
  }, // Flores
  { outline: [[119.0, -9.4], [119.9, -9.3], [120.8, -9.7], [120.7, -10.2], [120.0, -10.0], [119.2, -9.8]] }, // Sumba
  { outline: [[123.5, -10.35], [124.1, -9.9], [124.45, -9.3], [125.0, -9.1], [124.95, -9.6], [124.4, -10.1], [123.8, -10.4]] }, // West Timor
  {
    name: "Kalimantan",
    center: [113.6, -0.6],
    outline: [
      [109.6, 1.95], [109.0, 1.0], [109.0, 0.0], [109.3, -0.6], [110.0, -1.3], [110.1, -2.0], [110.6, -3.0],
      [111.5, -3.0], [112.3, -3.4], [113.0, -3.2], [114.0, -3.4], [114.6, -4.1], [115.9, -3.8], [116.3, -3.0],
      [116.6, -2.0], [116.5, -1.4], [117.3, -0.9], [117.5, 0.0], [117.9, 0.8], [118.9, 1.0], [118.0, 1.8],
      [117.8, 2.6], [117.6, 3.4], [117.6, 4.2], [116.0, 4.3], [115.6, 4.0], [115.4, 3.0], [114.6, 2.0],
      [114.0, 1.4], [113.0, 1.4], [112.0, 1.5], [111.0, 1.0], [110.3, 1.0],
    ],
  },
  {
    name: "Sulawesi",
    center: [120.4, -2.2],
    outline: [
      [125.2, 1.6], [124.4, 1.1], [123.4, 0.95], [122.4, 1.0], [121.3, 1.1], [120.6, 1.3], [120.0, 0.7],
      [119.8, 0.0], [119.5, -0.8], [119.4, -1.5], [118.9, -2.6], [118.8, -3.2], [119.4, -3.5], [119.5, -4.5],
      [119.4, -5.5], [120.4, -5.6], [120.35, -4.6], [120.6, -3.2], [121.1, -2.8], [121.6, -4.0], [121.9, -4.8],
      [122.6, -5.0], [122.9, -4.3], [122.4, -3.4], [121.9, -2.6], [122.5, -1.6], [123.4, -1.1], [123.3, -0.8],
      [122.0, -0.75], [121.0, -0.9], [120.2, 0.2], [121.0, 0.45], [122.5, 0.5], [123.5, 0.35], [124.5, 0.5], [125.3, 1.3],
    ],
  },
  {
    outline: [
      [127.5, 2.2], [128.2, 2.0], [128.0, 1.2], [128.7, 1.5], [128.2, 0.6], [128.9, 0.3], [128.0, 0.0],
      [128.4, -0.9], [127.8, -0.6], [127.6, 0.5], [127.4, 1.2],
    ],
  }, // Halmahera
  { name: "Maluku", center: [129.3, -3.2], outline: [[127.9, -2.8], [128.8, -2.9], [130.0, -2.9], [130.9, -3.3], [130.3, -3.6], [129.0, -3.5], [128.2, -3.4]] }, // Seram
  { outline: [[125.9, -3.2], [126.8, -3.0], [127.2, -3.6], [126.5, -3.9], [126.0, -3.6]] }, // Buru
  {
    name: "Papua",
    center: [138.2, -4.4],
    outline: [
      [131.0, -1.4], [131.3, -0.8], [132.3, -0.4], [133.5, -0.7], [134.1, -0.9], [134.2, -2.4], [135.0, -3.3],
      [135.8, -2.8], [136.4, -2.2], [137.2, -1.5], [138.0, -1.6], [139.0, -2.1], [140.0, -2.4], [141.0, -2.6],
      [141.0, -9.1], [140.2, -8.3], [139.0, -8.1], [138.5, -8.4], [137.7, -8.4], [138.0, -7.5], [138.7, -7.0],
      [138.2, -6.4], [137.5, -5.3], [136.0, -4.6], [134.8, -4.0], [134.0, -3.9], [133.3, -4.1], [132.8, -3.6],
      [132.9, -2.8], [132.1, -2.9], [131.8, -2.0],
    ],
  },
];

const SCALE = 0.45; // world units per degree
const CENTER_LON = 118;
const CENTER_LAT = -2.5;
const THICKNESS = 0.12;

// latitude/longitude to world coordinates: north moves away from the camera (-z axis)
function toWorld(lon: number, lat: number) {
  return new THREE.Vector3((lon - CENTER_LON) * SCALE, 0, -(lat - CENTER_LAT) * SCALE);
}

function Archipelago() {
  const geo = useMemo(() => {
    const shapes = ISLANDS.map(({ outline }) => {
      const s = new THREE.Shape();
      outline.forEach(([lon, lat], i) => {
        const x = (lon - CENTER_LON) * SCALE;
        const y = (lat - CENTER_LAT) * SCALE;
        if (i === 0) s.moveTo(x, y);
        else s.lineTo(x, y);
      });
      s.closePath();
      return s;
    });
    return new THREE.ExtrudeGeometry(shapes, { depth: THICKNESS, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2 });
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial attach="material-0" color="#e6eff7" roughness={0.8} />
      <meshStandardMaterial attach="material-1" color="#2f6b8f" roughness={0.6} />
    </mesh>
  );
}

function makeTexture(draw: (g: CanvasRenderingContext2D) => void, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Large island names, thin and lying flat above the land
function IslandName({ name, center }: { name: string; center: Point }) {
  const texture = useMemo(
    () =>
      makeTexture(
        (g) => {
          g.textAlign = "center";
          g.fillStyle = "rgba(1,42,61,0.45)";
          g.font = "600 44px Inter, system-ui, sans-serif";
          g.fillText(name.toUpperCase().split("").join(" "), 256, 60);
        },
        512,
        96,
      ),
    [name],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  const p = toWorld(...center);
  return (
    <mesh position={[p.x, THICKNESS + 0.04, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.4, 0.45]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

// Branch name label as a sprite so it always faces the camera
function useLabelTexture(title: string, sub: string, active: boolean) {
  const texture = useMemo(
    () =>
      makeTexture(
        (g) => {
          g.fillStyle = active ? "#012a3d" : "rgba(255,255,255,0.95)";
          g.beginPath();
          g.roundRect(6, 6, 308, 108, 26);
          g.fill();
          g.strokeStyle = active ? "#012a3d" : "#c9d8e4";
          g.lineWidth = 3;
          g.stroke();
          g.textAlign = "center";
          g.fillStyle = active ? "#ffffff" : "#012a3d";
          g.font = "700 40px Inter, system-ui, sans-serif";
          g.fillText(title, 160, 54);
          g.fillStyle = active ? "#c6d8e4" : "#2f6b8f";
          g.font = "600 30px Inter, system-ui, sans-serif";
          g.fillText(sub, 160, 94);
        },
        320,
        120,
      ),
    [title, sub, active],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function pillarHeight(share: number) {
  return 0.3 + share * 2.5;
}

function Pillar({
  point,
  order,
  active,
  hovered,
  onHover,
  onSelect,
}: {
  point: BranchPoint;
  order: number;
  active: boolean;
  hovered: boolean;
  onHover: (name: string | null) => void;
  onSelect: (name: string) => void;
}) {
  const p = toWorld(point.lon, point.lat);
  const height = pillarHeight(point.share);
  const stem = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const texture = useLabelTexture(point.name.replace(/ Branch$/, ""), point.label, active);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (stem.current) {
      // pillars grow once the camera starts moving in
      const k = THREE.MathUtils.clamp((t - 1.2 - order * 0.2) / 0.9, 0, 1);
      stem.current.scale.y = Math.max(1 - Math.pow(1 - k, 3), 0.001);
    }
    if (material.current) {
      const target = active ? 0.55 : hovered ? 0.35 : 0.08;
      material.current.emissiveIntensity = THREE.MathUtils.lerp(material.current.emissiveIntensity, target, 0.1);
    }
    if (ring.current) {
      const phase = (t * 0.8) % 1;
      const s = 1 + phase * 1.6;
      ring.current.scale.set(s, s, s);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = active ? 0.6 * (1 - phase) : 0;
    }
  });

  return (
    <group position={[p.x, THICKNESS + 0.03, p.z]}>
      <group ref={stem}>
        <mesh
          position={[0, height / 2, 0]}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(point.name);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            onHover(null);
            document.body.style.cursor = "";
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(point.name);
          }}
        >
          <cylinderGeometry args={[0.07, 0.085, height, 24]} />
          <meshStandardMaterial ref={material} color={point.color} emissive={point.color} emissiveIntensity={0.08} metalness={0.3} roughness={0.3} />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.13, 32]} />
        <meshBasicMaterial color={point.color} transparent opacity={0.3} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.1, 0.13, 40]} />
        <meshBasicMaterial color={point.color} transparent opacity={0} />
      </mesh>
      <sprite position={[0, height + 0.3, 0]} scale={[0.95, 0.36, 1]} renderOrder={10}>
        <spriteMaterial map={texture} depthTest={false} transparent />
      </sprite>
    </group>
  );
}

type Mode = "archipelago" | "focus";

// Camera view direction (from target to camera), normalized
const CAMERA_DIRECTION = new THREE.Vector3(0, 0.78, 0.63).normalize();

function CameraRig({ mode, focus }: { mode: Mode; focus: THREE.Vector3 }) {
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const positionRef = useRef(new THREE.Vector3());
  useFrame(({ camera, pointer }) => {
    const position = positionRef.current;
    const target = mode === "archipelago" ? new THREE.Vector3(0, 0, 0.2) : focus;
    const distance = mode === "archipelago" ? 14 : 5.2;
    position.copy(target).addScaledVector(CAMERA_DIRECTION, distance);
    // shift slightly with the cursor so it feels alive
    position.x += pointer.x * (mode === "archipelago" ? 0.8 : 0.4);
    camera.position.lerp(position, 0.045);
    look.current.lerp(target, 0.06);
    camera.lookAt(look.current);
  });
  return null;
}

function Scene({
  points,
  selected,
  onSelect,
  mode,
}: {
  points: BranchPoint[];
  selected: string | null;
  onSelect: (name: string) => void;
  mode: Mode;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  // camera focus point: the selected branch, or the middle of all branches
  const focus = useMemo(() => {
    const chosen = points.find((t) => t.name === selected);
    const list = chosen ? [chosen] : points;
    const v = new THREE.Vector3();
    list.forEach((t) => v.add(toWorld(t.lon, t.lat)));
    v.divideScalar(list.length || 1);
    v.y = 0.5;
    return v;
  }, [points, selected]);

  return (
    <>
      <CameraRig mode={mode} focus={focus} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <circleGeometry args={[16, 64]} />
        <meshStandardMaterial color="#dbe7f1" transparent opacity={0.5} />
      </mesh>
      <gridHelper args={[30, 60, "#c3d4e2", "#d7e3ec"]} position={[0, -0.03, 0]} />
      <Archipelago />
      {ISLANDS.filter((p) => p.name && p.center).map((p) => (
        <IslandName key={p.name} name={p.name!} center={p.center!} />
      ))}
      {points.map((t, i) => (
        <Pillar
          key={t.name}
          point={t}
          order={i}
          active={selected === t.name}
          hovered={hovered === t.name}
          onHover={setHovered}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export default function IndonesiaMap3D(props: { points: BranchPoint[]; selected: string | null; onSelect: (name: string) => void }) {
  // opens on the whole archipelago, then glides to the branches
  const [mode, setMode] = useState<Mode>("archipelago");
  const touched = useRef(false);
  useEffect(() => {
    const id = setTimeout(() => {
      if (!touched.current) setMode("focus");
    }, 1400);
    return () => {
      clearTimeout(id);
      document.body.style.cursor = "";
    };
  }, []);

  const select = (name: string) => {
    touched.current = true;
    setMode("focus");
    props.onSelect(name);
  };
  const toggleMode = () => {
    touched.current = true;
    setMode((m) => (m === "focus" ? "archipelago" : "focus"));
  };

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [0, 11, 9], fov: 40 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[4, 8, 6]} intensity={1.5} />
        <directionalLight position={[-5, 4, -4]} intensity={0.4} color="#c6d8e4" />
        <Scene {...props} onSelect={select} mode={mode} />
      </Canvas>
      <button
        type="button"
        onClick={toggleMode}
        className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-primary shadow-md ring-1 ring-gray-200 backdrop-blur hover:bg-white"
      >
        {mode === "focus" ? <Maximize2 className="w-3.5 h-3.5" /> : <Crosshair className="w-3.5 h-3.5" />}
        {mode === "focus" ? "All of Indonesia" : "Focus on branches"}
      </button>
    </div>
  );
}
