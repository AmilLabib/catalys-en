import confetti from "canvas-confetti";

const BRAND_COLORS = ["#012a3d", "#13577d", "#2f6b8f", "#5487ab", "#7193ad", "#9cb2c1"];

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Celebration confetti (successful payment, plan upgrade, payroll, etc.)
export function celebrate(strength: "small" | "big" = "small") {
  if (prefersReducedMotion()) return;
  const base = { colors: BRAND_COLORS, disableForReducedMotion: true, zIndex: 3000 };
  if (strength === "small") {
    confetti({ ...base, particleCount: 90, spread: 70, startVelocity: 38, origin: { y: 0.7 } });
    return;
  }
  // two bursts from the bottom left and right
  const end = Date.now() + 700;
  (function burst() {
    confetti({ ...base, particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.8 } });
    confetti({ ...base, particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.8 } });
    if (Date.now() < end) requestAnimationFrame(burst);
  })();
}
