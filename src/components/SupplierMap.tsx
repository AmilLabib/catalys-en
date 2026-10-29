import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RawMaterial, MaterialSupplier } from "../data/rawMaterials";
import { formatRp } from "../data/reports";
import { CITY_COORDINATES } from "../utils/pricing";

// Map of suppliers around the store. Supplier positions are sample data:
// placed `distanceKm` from the city center in a fixed direction per store name.


// Marker color per store type, all from the app's navy palette
// Map tiles: CARTO when VITE_CARTO_API_KEY is set in .env (CARTO now requires an API key),
// otherwise the free, keyless Esri Light Gray Canvas. Both have a light gray look.
const CARTO_KEY = (import.meta.env.VITE_CARTO_API_KEY as string | undefined)?.trim();

const TYPE_COLORS: Record<MaterialSupplier["type"], { bg: string; letter: string }> = {
  "Traditional market": { bg: "#9cb2c1", letter: "M" },
  Wholesaler: { bg: "#2f6b8f", letter: "W" },
  Distributor: { bg: "#012a3d", letter: "D" },
};

export type SupplierPoint = {
  supplier: MaterialSupplier;
  materials: { material: RawMaterial; supplier: MaterialSupplier }[];
};

function position(center: [number, number], name: string, km: number): [number, number] {
  const h = Array.from(name).reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
  const heading = ((h % 360) * Math.PI) / 180;
  const lat = center[0] + (km / 111) * Math.cos(heading);
  const lon = center[1] + (km / (111 * Math.cos((center[0] * Math.PI) / 180))) * Math.sin(heading);
  return [lat, lon];
}

const storeIcon = L.divIcon({
  className: "",
  html: `<div style="width:34px;height:34px;border-radius:12px;background:linear-gradient(135deg,#012a3d,#13577d);border:3px solid #fff;box-shadow:0 6px 14px -4px rgba(1,42,61,.6);display:flex;align-items:center;justify-content:center;color:#fff;font:700 15px Inter,sans-serif">★</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function supplierIcon(type: MaterialSupplier["type"]) {
  const w = TYPE_COLORS[type];
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:9999px 9999px 9999px 2px;transform:rotate(-45deg);background:${w.bg};border:2px solid #fff;box-shadow:0 4px 10px -3px rgba(1,42,61,.55);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#fff;font:700 12px Inter,sans-serif">${w.letter}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [4, 26],
    popupAnchor: [10, -24],
  });
}

export default function SupplierMap({
  city,
  points,
  onBuy,
}: {
  city: string;
  points: SupplierPoint[];
  onBuy: (material: RawMaterial, supplier: MaterialSupplier) => void;
}) {
  const center = CITY_COORDINATES[city] ?? CITY_COORDINATES.Bogor;
  const farthest = Math.max(2, ...points.map((t) => t.supplier.distanceKm));
  const icons = useMemo(
    () => ({
      "Traditional market": supplierIcon("Traditional market"),
      Wholesaler: supplierIcon("Wholesaler"),
      Distributor: supplierIcon("Distributor"),
    }),
    [],
  );

  return (
    // isolate: Leaflet panes use a high z-index, don't let them cover the app's popups/navbar
    <div className="relative isolate z-0 h-80 overflow-hidden rounded-2xl ring-1 ring-gray-200">
      <MapContainer key={city} center={center} zoom={farthest > 8 ? 11 : 12} scrollWheelZoom={false} maxZoom={16} className="h-full w-full">
        {CARTO_KEY ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`}
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
        <Circle center={center} radius={farthest * 1000} pathOptions={{ color: "#2f6b8f", weight: 1, dashArray: "4 6", fillColor: "#9cb2c1", fillOpacity: 0.08 }} />
        <Marker position={center} icon={storeIcon}>
          <Popup>
            <b>Your Store</b>
            <br />
            Around {city}
          </Popup>
        </Marker>
        {points.map((t) => (
          <Marker key={t.supplier.name} position={position(center, t.supplier.name, t.supplier.distanceKm)} icon={icons[t.supplier.type]}>
            <Popup minWidth={220}>
              <div className="text-xs">
                <img src={t.supplier.photo.src} alt="" className="mb-2 h-20 w-full rounded-md object-cover" />
                <p className="text-sm font-bold text-primary leading-tight">{t.supplier.name}</p>
                <p className="text-gray-500">
                  {t.supplier.type} · {t.supplier.distanceKm} km · {t.supplier.district}
                </p>
                <p className="mt-2 mb-1 font-semibold text-gray-700">Available materials</p>
                <ul className="space-y-1">
                  {t.materials.map(({ material, supplier }) => (
                    <li key={material.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {material.name} · {formatRp(supplier.price)}/{material.unit}
                      </span>
                      <button
                        onClick={() => onBuy(material, supplier)}
                        className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-white"
                      >
                        Buy
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* legend */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-[500] flex flex-wrap gap-2 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] text-gray-600 shadow-sm backdrop-blur">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-gradient-to-br from-[#012a3d] to-[#13577d]" /> Your Store
        </span>
        {Object.entries(TYPE_COLORS).map(([j, w]) => (
          <span key={j} className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: w.bg }} /> {j}
          </span>
        ))}
      </div>
    </div>
  );
}
