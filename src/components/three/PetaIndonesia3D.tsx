import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Maximize2, Crosshair } from "lucide-react";

// Peta Indonesia 3D. Tiap cabang berdiri sebagai pilar setinggi porsi
// pendapatannya. Kamera dibuka dari seluruh nusantara lalu meluncur ke cabang.

export type TitikCabang = {
  nama: string;
  lon: number;
  lat: number;
  porsi: number; // 0..1, porsi pendapatan terhadap total cabang
  label: string; // teks kecil di bawah nama, mis. "Rp 1,2 M"
  warna: string;
};

type Titik = [number, number]; // [bujur, lintang]

// Garis pantai yang disederhanakan. Kalimantan, Timor, dan Papua hanya bagian Indonesia.
const PULAU: { nama?: string; pusat?: Titik; garis: Titik[] }[] = [
  {
    nama: "Sumatra",
    pusat: [101.6, -0.6],
    garis: [
      [95.2, 5.6], [95.9, 5.5], [97.5, 5.2], [98.3, 4.2], [99.0, 3.6], [100.0, 2.6], [100.9, 2.0], [101.4, 1.7],
      [102.2, 1.2], [103.1, 0.5], [103.8, 0.0], [103.6, -0.8], [104.4, -1.1], [104.6, -1.9], [105.2, -2.3],
      [105.8, -2.9], [106.0, -3.3], [105.9, -4.3], [105.9, -5.7], [105.6, -5.85], [105.2, -5.6], [104.6, -5.9],
      [104.5, -5.6], [103.9, -5.0], [102.9, -4.2], [102.3, -3.6], [101.4, -2.8], [100.9, -2.1], [100.4, -1.1],
      [99.8, -0.2], [99.3, 0.4], [98.8, 1.5], [98.3, 2.2], [97.6, 2.9], [97.1, 3.7], [96.4, 4.3], [95.6, 4.8], [95.2, 5.3],
    ],
  },
  { garis: [[105.1, -1.6], [105.8, -1.5], [106.3, -2.2], [106.8, -3.0], [106.1, -3.1], [105.4, -2.4]] }, // Bangka
  { garis: [[107.6, -2.6], [108.3, -2.6], [108.3, -3.2], [107.6, -3.2]] }, // Belitung
  {
    nama: "Jawa",
    pusat: [110.2, -7.35],
    garis: [
      [105.22, -6.82], [105.6, -6.4], [105.95, -5.95], [106.4, -6.0], [106.75, -6.08], [107.1, -5.98],
      [107.5, -6.05], [107.95, -6.25], [108.32, -6.22], [108.6, -6.72], [109.1, -6.84], [109.68, -6.86],
      [110.15, -6.92], [110.42, -6.95], [110.62, -6.62], [110.72, -6.42], [111.05, -6.5], [111.45, -6.68],
      [112.0, -6.86], [112.55, -6.88], [112.78, -7.18], [112.92, -7.58], [113.45, -7.72], [113.95, -7.68],
      [114.38, -7.78], [114.45, -8.15], [114.42, -8.72], [113.85, -8.45], [113.25, -8.3], [112.6, -8.42],
      [111.85, -8.3], [111.05, -8.22], [110.32, -8.02], [109.55, -7.8], [109.0, -7.74], [108.5, -7.82],
      [107.85, -7.64], [107.05, -7.42], [106.45, -7.02], [105.85, -6.86],
    ],
  },
  { garis: [[112.7, -6.9], [113.5, -6.88], [114.1, -6.95], [113.9, -7.15], [113.0, -7.2], [112.75, -7.1]] }, // Madura
  { garis: [[114.55, -8.1], [114.9, -8.1], [115.2, -8.05], [115.7, -8.35], [115.5, -8.65], [115.2, -8.8], [115.1, -8.6], [114.6, -8.4]] }, // Bali
  { garis: [[115.85, -8.25], [116.4, -8.2], [116.7, -8.5], [116.5, -8.9], [116.0, -8.9], [115.85, -8.7]] }, // Lombok
  {
    garis: [
      [116.8, -8.5], [117.2, -8.35], [117.8, -8.1], [118.3, -8.3], [118.8, -8.2], [119.1, -8.5], [118.9, -8.8],
      [118.2, -8.8], [117.6, -9.0], [117.1, -8.95], [116.8, -8.8],
    ],
  }, // Sumbawa
  {
    garis: [
      [119.8, -8.5], [120.5, -8.3], [121.3, -8.45], [122.0, -8.4], [122.9, -8.1], [123.0, -8.4], [122.3, -8.7],
      [121.5, -8.85], [120.6, -8.85], [119.9, -8.8],
    ],
  }, // Flores
  { garis: [[119.0, -9.4], [119.9, -9.3], [120.8, -9.7], [120.7, -10.2], [120.0, -10.0], [119.2, -9.8]] }, // Sumba
  { garis: [[123.5, -10.35], [124.1, -9.9], [124.45, -9.3], [125.0, -9.1], [124.95, -9.6], [124.4, -10.1], [123.8, -10.4]] }, // Timor Barat
  {
    nama: "Kalimantan",
    pusat: [113.6, -0.6],
    garis: [
      [109.6, 1.95], [109.0, 1.0], [109.0, 0.0], [109.3, -0.6], [110.0, -1.3], [110.1, -2.0], [110.6, -3.0],
      [111.5, -3.0], [112.3, -3.4], [113.0, -3.2], [114.0, -3.4], [114.6, -4.1], [115.9, -3.8], [116.3, -3.0],
      [116.6, -2.0], [116.5, -1.4], [117.3, -0.9], [117.5, 0.0], [117.9, 0.8], [118.9, 1.0], [118.0, 1.8],
      [117.8, 2.6], [117.6, 3.4], [117.6, 4.2], [116.0, 4.3], [115.6, 4.0], [115.4, 3.0], [114.6, 2.0],
      [114.0, 1.4], [113.0, 1.4], [112.0, 1.5], [111.0, 1.0], [110.3, 1.0],
    ],
  },
  {
    nama: "Sulawesi",
    pusat: [120.4, -2.2],
    garis: [
      [125.2, 1.6], [124.4, 1.1], [123.4, 0.95], [122.4, 1.0], [121.3, 1.1], [120.6, 1.3], [120.0, 0.7],
      [119.8, 0.0], [119.5, -0.8], [119.4, -1.5], [118.9, -2.6], [118.8, -3.2], [119.4, -3.5], [119.5, -4.5],
      [119.4, -5.5], [120.4, -5.6], [120.35, -4.6], [120.6, -3.2], [121.1, -2.8], [121.6, -4.0], [121.9, -4.8],
      [122.6, -5.0], [122.9, -4.3], [122.4, -3.4], [121.9, -2.6], [122.5, -1.6], [123.4, -1.1], [123.3, -0.8],
      [122.0, -0.75], [121.0, -0.9], [120.2, 0.2], [121.0, 0.45], [122.5, 0.5], [123.5, 0.35], [124.5, 0.5], [125.3, 1.3],
    ],
  },
  {
    garis: [
      [127.5, 2.2], [128.2, 2.0], [128.0, 1.2], [128.7, 1.5], [128.2, 0.6], [128.9, 0.3], [128.0, 0.0],
      [128.4, -0.9], [127.8, -0.6], [127.6, 0.5], [127.4, 1.2],
    ],
  }, // Halmahera
  { nama: "Maluku", pusat: [129.3, -3.2], garis: [[127.9, -2.8], [128.8, -2.9], [130.0, -2.9], [130.9, -3.3], [130.3, -3.6], [129.0, -3.5], [128.2, -3.4]] }, // Seram
  { garis: [[125.9, -3.2], [126.8, -3.0], [127.2, -3.6], [126.5, -3.9], [126.0, -3.6]] }, // Buru
  {
    nama: "Papua",
    pusat: [138.2, -4.4],
    garis: [
      [131.0, -1.4], [131.3, -0.8], [132.3, -0.4], [133.5, -0.7], [134.1, -0.9], [134.2, -2.4], [135.0, -3.3],
      [135.8, -2.8], [136.4, -2.2], [137.2, -1.5], [138.0, -1.6], [139.0, -2.1], [140.0, -2.4], [141.0, -2.6],
      [141.0, -9.1], [140.2, -8.3], [139.0, -8.1], [138.5, -8.4], [137.7, -8.4], [138.0, -7.5], [138.7, -7.0],
      [138.2, -6.4], [137.5, -5.3], [136.0, -4.6], [134.8, -4.0], [134.0, -3.9], [133.3, -4.1], [132.8, -3.6],
      [132.9, -2.8], [132.1, -2.9], [131.8, -2.0],
    ],
  },
];

const SKALA = 0.45; // satuan dunia per derajat
const PUSAT_LON = 118;
const PUSAT_LAT = -2.5;
const TEBAL = 0.12;

// lintang/bujur ke koordinat dunia: utara menjauh dari kamera (sumbu -z)
function keDunia(lon: number, lat: number) {
  return new THREE.Vector3((lon - PUSAT_LON) * SKALA, 0, -(lat - PUSAT_LAT) * SKALA);
}

function Kepulauan() {
  const geo = useMemo(() => {
    const bentuk = PULAU.map(({ garis }) => {
      const s = new THREE.Shape();
      garis.forEach(([lon, lat], i) => {
        const x = (lon - PUSAT_LON) * SKALA;
        const y = (lat - PUSAT_LAT) * SKALA;
        if (i === 0) s.moveTo(x, y);
        else s.lineTo(x, y);
      });
      s.closePath();
      return s;
    });
    return new THREE.ExtrudeGeometry(bentuk, { depth: TEBAL, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2 });
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial attach="material-0" color="#e6eff7" roughness={0.8} />
      <meshStandardMaterial attach="material-1" color="#2f6b8f" roughness={0.6} />
    </mesh>
  );
}

function buatTekstur(gambar: (g: CanvasRenderingContext2D) => void, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  gambar(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Nama pulau besar, tipis dan mendatar di atas daratan
function NamaPulau({ nama, pusat }: { nama: string; pusat: Titik }) {
  const tekstur = useMemo(
    () =>
      buatTekstur(
        (g) => {
          g.textAlign = "center";
          g.fillStyle = "rgba(1,42,61,0.45)";
          g.font = "600 44px Inter, system-ui, sans-serif";
          g.fillText(nama.toUpperCase().split("").join(" "), 256, 60);
        },
        512,
        96,
      ),
    [nama],
  );
  useEffect(() => () => tekstur.dispose(), [tekstur]);
  const p = keDunia(...pusat);
  return (
    <mesh position={[p.x, TEBAL + 0.04, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.4, 0.45]} />
      <meshBasicMaterial map={tekstur} transparent depthWrite={false} />
    </mesh>
  );
}

// Label nama cabang sebagai sprite agar selalu menghadap kamera
function useTeksturLabel(judul: string, sub: string, aktif: boolean) {
  const tekstur = useMemo(
    () =>
      buatTekstur(
        (g) => {
          g.fillStyle = aktif ? "#012a3d" : "rgba(255,255,255,0.95)";
          g.beginPath();
          g.roundRect(6, 6, 308, 108, 26);
          g.fill();
          g.strokeStyle = aktif ? "#012a3d" : "#c9d8e4";
          g.lineWidth = 3;
          g.stroke();
          g.textAlign = "center";
          g.fillStyle = aktif ? "#ffffff" : "#012a3d";
          g.font = "700 40px Inter, system-ui, sans-serif";
          g.fillText(judul, 160, 54);
          g.fillStyle = aktif ? "#c6d8e4" : "#2f6b8f";
          g.font = "600 30px Inter, system-ui, sans-serif";
          g.fillText(sub, 160, 94);
        },
        320,
        120,
      ),
    [judul, sub, aktif],
  );
  useEffect(() => () => tekstur.dispose(), [tekstur]);
  return tekstur;
}

function tinggiPilar(porsi: number) {
  return 0.3 + porsi * 2.5;
}

function Pilar({
  titik,
  urutan,
  aktif,
  sorot,
  onSorot,
  onPilih,
}: {
  titik: TitikCabang;
  urutan: number;
  aktif: boolean;
  sorot: boolean;
  onSorot: (nama: string | null) => void;
  onPilih: (nama: string) => void;
}) {
  const p = keDunia(titik.lon, titik.lat);
  const tinggi = tinggiPilar(titik.porsi);
  const batang = useRef<THREE.Group>(null);
  const cincin = useRef<THREE.Mesh>(null);
  const bahan = useRef<THREE.MeshStandardMaterial>(null);
  const tekstur = useTeksturLabel(titik.nama.replace("Cabang ", ""), titik.label, aktif);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (batang.current) {
      // pilar tumbuh setelah kamera mulai mendekat
      const k = THREE.MathUtils.clamp((t - 1.2 - urutan * 0.2) / 0.9, 0, 1);
      batang.current.scale.y = Math.max(1 - Math.pow(1 - k, 3), 0.001);
    }
    if (bahan.current) {
      const target = aktif ? 0.55 : sorot ? 0.35 : 0.08;
      bahan.current.emissiveIntensity = THREE.MathUtils.lerp(bahan.current.emissiveIntensity, target, 0.1);
    }
    if (cincin.current) {
      const fase = (t * 0.8) % 1;
      const s = 1 + fase * 1.6;
      cincin.current.scale.set(s, s, s);
      (cincin.current.material as THREE.MeshBasicMaterial).opacity = aktif ? 0.6 * (1 - fase) : 0;
    }
  });

  return (
    <group position={[p.x, TEBAL + 0.03, p.z]}>
      <group ref={batang}>
        <mesh
          position={[0, tinggi / 2, 0]}
          onPointerOver={(e) => {
            e.stopPropagation();
            onSorot(titik.nama);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            onSorot(null);
            document.body.style.cursor = "";
          }}
          onClick={(e) => {
            e.stopPropagation();
            onPilih(titik.nama);
          }}
        >
          <cylinderGeometry args={[0.07, 0.085, tinggi, 24]} />
          <meshStandardMaterial ref={bahan} color={titik.warna} emissive={titik.warna} emissiveIntensity={0.08} metalness={0.3} roughness={0.3} />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.13, 32]} />
        <meshBasicMaterial color={titik.warna} transparent opacity={0.3} />
      </mesh>
      <mesh ref={cincin} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.1, 0.13, 40]} />
        <meshBasicMaterial color={titik.warna} transparent opacity={0} />
      </mesh>
      <sprite position={[0, tinggi + 0.3, 0]} scale={[0.95, 0.36, 1]} renderOrder={10}>
        <spriteMaterial map={tekstur} depthTest={false} transparent />
      </sprite>
    </group>
  );
}

type Mode = "nusantara" | "fokus";

// Arah pandang kamera (dari target ke kamera), dinormalisasi
const ARAH_KAMERA = new THREE.Vector3(0, 0.78, 0.63).normalize();

function Kamera({ mode, fokus }: { mode: Mode; fokus: THREE.Vector3 }) {
  const lihat = useRef(new THREE.Vector3(0, 0, 0));
  const posisiRef = useRef(new THREE.Vector3());
  useFrame(({ camera, pointer }) => {
    const posisi = posisiRef.current;
    const target = mode === "nusantara" ? new THREE.Vector3(0, 0, 0.2) : fokus;
    const jarak = mode === "nusantara" ? 14 : 5.2;
    posisi.copy(target).addScaledVector(ARAH_KAMERA, jarak);
    // geser sedikit mengikuti kursor agar terasa hidup
    posisi.x += pointer.x * (mode === "nusantara" ? 0.8 : 0.4);
    camera.position.lerp(posisi, 0.045);
    lihat.current.lerp(target, 0.06);
    camera.lookAt(lihat.current);
  });
  return null;
}

function Adegan({
  titik,
  dipilih,
  onPilih,
  mode,
}: {
  titik: TitikCabang[];
  dipilih: string | null;
  onPilih: (nama: string) => void;
  mode: Mode;
}) {
  const [sorot, setSorot] = useState<string | null>(null);

  // titik fokus kamera: cabang terpilih, atau tengah-tengah semua cabang
  const fokus = useMemo(() => {
    const pilih = titik.find((t) => t.nama === dipilih);
    const daftar = pilih ? [pilih] : titik;
    const v = new THREE.Vector3();
    daftar.forEach((t) => v.add(keDunia(t.lon, t.lat)));
    v.divideScalar(daftar.length || 1);
    v.y = 0.5;
    return v;
  }, [titik, dipilih]);

  return (
    <>
      <Kamera mode={mode} fokus={fokus} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <circleGeometry args={[16, 64]} />
        <meshStandardMaterial color="#dbe7f1" transparent opacity={0.5} />
      </mesh>
      <gridHelper args={[30, 60, "#c3d4e2", "#d7e3ec"]} position={[0, -0.03, 0]} />
      <Kepulauan />
      {PULAU.filter((p) => p.nama && p.pusat).map((p) => (
        <NamaPulau key={p.nama} nama={p.nama!} pusat={p.pusat!} />
      ))}
      {titik.map((t, i) => (
        <Pilar
          key={t.nama}
          titik={t}
          urutan={i}
          aktif={dipilih === t.nama}
          sorot={sorot === t.nama}
          onSorot={setSorot}
          onPilih={onPilih}
        />
      ))}
    </>
  );
}

export default function PetaIndonesia3D(props: { titik: TitikCabang[]; dipilih: string | null; onPilih: (nama: string) => void }) {
  // dibuka dari seluruh nusantara, lalu meluncur ke cabang
  const [mode, setMode] = useState<Mode>("nusantara");
  const sudahDisentuh = useRef(false);
  useEffect(() => {
    const id = setTimeout(() => {
      if (!sudahDisentuh.current) setMode("fokus");
    }, 1400);
    return () => {
      clearTimeout(id);
      document.body.style.cursor = "";
    };
  }, []);

  const pilih = (nama: string) => {
    sudahDisentuh.current = true;
    setMode("fokus");
    props.onPilih(nama);
  };
  const gantiMode = () => {
    sudahDisentuh.current = true;
    setMode((m) => (m === "fokus" ? "nusantara" : "fokus"));
  };

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [0, 11, 9], fov: 40 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[4, 8, 6]} intensity={1.5} />
        <directionalLight position={[-5, 4, -4]} intensity={0.4} color="#c6d8e4" />
        <Adegan {...props} onPilih={pilih} mode={mode} />
      </Canvas>
      <button
        type="button"
        onClick={gantiMode}
        className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-primary shadow-md ring-1 ring-gray-200 backdrop-blur hover:bg-white"
      >
        {mode === "fokus" ? <Maximize2 className="w-3.5 h-3.5" /> : <Crosshair className="w-3.5 h-3.5" />}
        {mode === "fokus" ? "Seluruh Indonesia" : "Fokus cabang"}
      </button>
    </div>
  );
}
