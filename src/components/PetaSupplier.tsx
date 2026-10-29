import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { BahanBaku, SupplierBahan } from "../data/bahanBaku";
import { formatRp } from "../data/laporan";
import { KOORDINAT_KOTA } from "../utils/pricing";

// Peta sebaran supplier di sekitar toko. Posisi supplier adalah data contoh:
// diletakkan sejauh `jarakKm` dari pusat kota dengan arah yang tetap per nama toko.


// Warna penanda per jenis toko, semuanya dari palet navy aplikasi
// Ubin peta: CARTO bila VITE_CARTO_API_KEY diisi di .env (CARTO kini mewajibkan API key),
// selain itu Esri Light Gray Canvas yang gratis tanpa key. Keduanya bernuansa abu-abu terang.
const KUNCI_CARTO = (import.meta.env.VITE_CARTO_API_KEY as string | undefined)?.trim();

const WARNA_JENIS: Record<SupplierBahan["jenis"], { bg: string; huruf: string }> = {
  "Pasar tradisional": { bg: "#9cb2c1", huruf: "P" },
  Grosir: { bg: "#2f6b8f", huruf: "G" },
  Distributor: { bg: "#012a3d", huruf: "D" },
};

export type TitikSupplier = {
  supplier: SupplierBahan;
  bahan: { bahan: BahanBaku; supplier: SupplierBahan }[];
};

function posisi(pusat: [number, number], nama: string, km: number): [number, number] {
  const h = Array.from(nama).reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
  const arah = ((h % 360) * Math.PI) / 180;
  const lat = pusat[0] + (km / 111) * Math.cos(arah);
  const lon = pusat[1] + (km / (111 * Math.cos((pusat[0] * Math.PI) / 180))) * Math.sin(arah);
  return [lat, lon];
}

const ikonToko = L.divIcon({
  className: "",
  html: `<div style="width:34px;height:34px;border-radius:12px;background:linear-gradient(135deg,#012a3d,#13577d);border:3px solid #fff;box-shadow:0 6px 14px -4px rgba(1,42,61,.6);display:flex;align-items:center;justify-content:center;color:#fff;font:700 15px Inter,sans-serif">★</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function ikonSupplier(jenis: SupplierBahan["jenis"]) {
  const w = WARNA_JENIS[jenis];
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:9999px 9999px 9999px 2px;transform:rotate(-45deg);background:${w.bg};border:2px solid #fff;box-shadow:0 4px 10px -3px rgba(1,42,61,.55);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#fff;font:700 12px Inter,sans-serif">${w.huruf}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [4, 26],
    popupAnchor: [10, -24],
  });
}

export default function PetaSupplier({
  kota,
  titik,
  onBeli,
}: {
  kota: string;
  titik: TitikSupplier[];
  onBeli: (bahan: BahanBaku, supplier: SupplierBahan) => void;
}) {
  const pusat = KOORDINAT_KOTA[kota] ?? KOORDINAT_KOTA.Bogor;
  const terjauh = Math.max(2, ...titik.map((t) => t.supplier.jarakKm));
  const ikon = useMemo(
    () => ({
      "Pasar tradisional": ikonSupplier("Pasar tradisional"),
      Grosir: ikonSupplier("Grosir"),
      Distributor: ikonSupplier("Distributor"),
    }),
    [],
  );

  return (
    // isolate: panel Leaflet memakai z-index tinggi, jangan sampai menutupi popup/navbar aplikasi
    <div className="relative isolate z-0 h-80 overflow-hidden rounded-2xl ring-1 ring-gray-200">
      <MapContainer key={kota} center={pusat} zoom={terjauh > 8 ? 11 : 12} scrollWheelZoom={false} maxZoom={16} className="h-full w-full">
        {KUNCI_CARTO ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${KUNCI_CARTO}`}
            subdomains="abcd"
            maxZoom={16}
          />
        ) : (
          <>
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
            />
          </>
        )}
        <Circle center={pusat} radius={terjauh * 1000} pathOptions={{ color: "#2f6b8f", weight: 1, dashArray: "4 6", fillColor: "#9cb2c1", fillOpacity: 0.08 }} />
        <Marker position={pusat} icon={ikonToko}>
          <Popup>
            <b>Toko Anda</b>
            <br />
            Sekitar {kota}
          </Popup>
        </Marker>
        {titik.map((t) => (
          <Marker key={t.supplier.nama} position={posisi(pusat, t.supplier.nama, t.supplier.jarakKm)} icon={ikon[t.supplier.jenis]}>
            <Popup minWidth={220}>
              <div className="text-xs">
                <img src={t.supplier.foto.src} alt="" className="mb-2 h-20 w-full rounded-md object-cover" />
                <p className="text-sm font-bold text-primary leading-tight">{t.supplier.nama}</p>
                <p className="text-gray-500">
                  {t.supplier.jenis} · {t.supplier.jarakKm} km · {t.supplier.kecamatan}
                </p>
                <p className="mt-2 mb-1 font-semibold text-gray-700">Bahan tersedia</p>
                <ul className="space-y-1">
                  {t.bahan.map(({ bahan, supplier }) => (
                    <li key={bahan.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {bahan.nama} · {formatRp(supplier.harga)}/{bahan.satuan}
                      </span>
                      <button
                        onClick={() => onBeli(bahan, supplier)}
                        className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-white"
                      >
                        Beli
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* legenda */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-[500] flex flex-wrap gap-2 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] text-gray-600 shadow-sm backdrop-blur">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-gradient-to-br from-[#012a3d] to-[#13577d]" /> Toko Anda
        </span>
        {Object.entries(WARNA_JENIS).map(([j, w]) => (
          <span key={j} className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: w.bg }} /> {j}
          </span>
        ))}
      </div>
    </div>
  );
}
