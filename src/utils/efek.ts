import confetti from "canvas-confetti";

const WARNA_BRAND = ["#012a3d", "#13577d", "#2f6b8f", "#5487ab", "#7193ad", "#9cb2c1"];

export const kurangiGerak = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Confetti perayaan (pembayaran berhasil, upgrade paket, penggajian, dll.)
export function rayakan(kuat: "kecil" | "besar" = "kecil") {
  if (kurangiGerak()) return;
  const dasar = { colors: WARNA_BRAND, disableForReducedMotion: true, zIndex: 3000 };
  if (kuat === "kecil") {
    confetti({ ...dasar, particleCount: 90, spread: 70, startVelocity: 38, origin: { y: 0.7 } });
    return;
  }
  // dua semburan dari kiri dan kanan bawah
  const akhir = Date.now() + 700;
  (function semprot() {
    confetti({ ...dasar, particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.8 } });
    confetti({ ...dasar, particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.8 } });
    if (Date.now() < akhir) requestAnimationFrame(semprot);
  })();
}
