import { useState } from "react";

// Gambar produk dengan cadangan berupa inisial jika foto tidak ada / gagal dimuat.
export default function ProductImage({
  src,
  name,
  className = "",
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  const [gagal, setGagal] = useState(false);
  if (!src || gagal) {
    const inisial = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-[#e1ecf3] to-[#9cb2c1] text-primary font-bold ${className}`}
        aria-label={name}
      >
        <span className="text-lg">{inisial}</span>
      </div>
    );
  }
  return <img src={src} alt={name} onError={() => setGagal(true)} className={`object-cover ${className}`} />;
}
