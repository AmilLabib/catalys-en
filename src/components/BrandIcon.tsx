import { BRAND_ICONS } from "../data/brandIcons";

export type Brand = keyof typeof BRAND_ICONS | "tokopedia";

// Ikon merek berwarna. Tokopedia tidak tersedia di Simple Icons, jadi
// ditampilkan sebagai lencana huruf "T" berwarna hijau Tokopedia.
export default function BrandIcon({ brand, size = 16, className = "" }: { brand: Brand; size?: number; className?: string }) {
  if (brand === "tokopedia") {
    return (
      <span
        role="img"
        aria-label="Tokopedia"
        className={`inline-flex items-center justify-center rounded-[4px] font-bold text-white leading-none shrink-0 ${className}`}
        style={{ width: size, height: size, background: "#42B549", fontSize: size * 0.65 }}
      >
        T
      </span>
    );
  }
  const icon = BRAND_ICONS[brand];
  return (
    <svg
      role="img"
      aria-label={icon.title}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={icon.hex}
      className={`shrink-0 ${className}`}
    >
      <path d={icon.path} />
    </svg>
  );
}
