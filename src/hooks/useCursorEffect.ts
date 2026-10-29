import { useEffect } from "react";
import { prefersReducedMotion } from "../utils/effects";

// Global cursor effect (event delegation, so it applies to every card/button
// without wrapping components one by one):
// - .card-gradient : 3D tilt following the cursor + light sheen
// - .btn-gradient  : button is slightly "pulled" toward the cursor
// Disabled on touch screens and when the user chooses "reduce motion".
export function useCursorEffect() {
  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let activeCard: HTMLElement | null = null;
    let activeButton: HTMLElement | null = null;

    const releaseCard = () => {
      if (!activeCard) return;
      activeCard.style.removeProperty("--rx");
      activeCard.style.removeProperty("--ry");
      activeCard.classList.remove("tilt-active");
      activeCard = null;
    };
    const releaseButton = () => {
      if (!activeButton) return;
      activeButton.style.removeProperty("--mx");
      activeButton.style.removeProperty("--my");
      activeButton = null;
    };

    const move = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;

      const card = target?.closest<HTMLElement>(".card-gradient") ?? null;
      if (card !== activeCard) releaseCard();
      if (card) {
        activeCard = card;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.classList.add("tilt-active");
        card.style.setProperty("--rx", `${(0.5 - py) * 8}deg`);
        card.style.setProperty("--ry", `${(px - 0.5) * 10}deg`);
        card.style.setProperty("--gx", `${px * 100}%`);
        card.style.setProperty("--gy", `${py * 100}%`);
      }

      const button = target?.closest<HTMLElement>(".btn-gradient") ?? null;
      if (button !== activeButton) releaseButton();
      if (button) {
        activeButton = button;
        const r = button.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        button.style.setProperty("--mx", `${Math.max(-6, Math.min(6, dx * 0.12))}px`);
        button.style.setProperty("--my", `${Math.max(-4, Math.min(4, dy * 0.2))}px`);
      }
    };

    const leave = () => {
      releaseCard();
      releaseButton();
    };

    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
      leave();
    };
  }, []);
}
