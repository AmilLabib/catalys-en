import { useState } from "react";

// Product image that falls back to initials when there is no photo or it fails to load.
export default function ProductImage({
  src,
  name,
  className = "",
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    const initials = name
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
        <span className="text-lg">{initials}</span>
      </div>
    );
  }
  return <img src={src} alt={name} onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}
