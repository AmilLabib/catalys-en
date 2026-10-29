import { useEffect } from "react";
import { kurangiGerak } from "../utils/efek";

// Efek kursor global (event delegation, jadi berlaku untuk semua kartu/tombol
// tanpa membungkus komponen satu per satu):
// - .card-gradient : miring 3D mengikuti kursor + kilau cahaya
// - .btn-gradient  : tombol sedikit "tertarik" ke arah kursor
// Nonaktif di layar sentuh dan saat pengguna memilih "kurangi gerakan".
export function useEfekKursor() {
  useEffect(() => {
    if (kurangiGerak() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let kartuAktif: HTMLElement | null = null;
    let tombolAktif: HTMLElement | null = null;

    const lepasKartu = () => {
      if (!kartuAktif) return;
      kartuAktif.style.removeProperty("--rx");
      kartuAktif.style.removeProperty("--ry");
      kartuAktif.classList.remove("tilt-aktif");
      kartuAktif = null;
    };
    const lepasTombol = () => {
      if (!tombolAktif) return;
      tombolAktif.style.removeProperty("--mx");
      tombolAktif.style.removeProperty("--my");
      tombolAktif = null;
    };

    const gerak = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;

      const kartu = target?.closest<HTMLElement>(".card-gradient") ?? null;
      if (kartu !== kartuAktif) lepasKartu();
      if (kartu) {
        kartuAktif = kartu;
        const r = kartu.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        kartu.classList.add("tilt-aktif");
        kartu.style.setProperty("--rx", `${(0.5 - py) * 8}deg`);
        kartu.style.setProperty("--ry", `${(px - 0.5) * 10}deg`);
        kartu.style.setProperty("--gx", `${px * 100}%`);
        kartu.style.setProperty("--gy", `${py * 100}%`);
      }

      const tombol = target?.closest<HTMLElement>(".btn-gradient") ?? null;
      if (tombol !== tombolAktif) lepasTombol();
      if (tombol) {
        tombolAktif = tombol;
        const r = tombol.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        tombol.style.setProperty("--mx", `${Math.max(-6, Math.min(6, dx * 0.12))}px`);
        tombol.style.setProperty("--my", `${Math.max(-4, Math.min(4, dy * 0.2))}px`);
      }
    };

    const keluar = () => {
      lepasKartu();
      lepasTombol();
    };

    document.addEventListener("pointermove", gerak, { passive: true });
    document.addEventListener("pointerleave", keluar);
    window.addEventListener("blur", keluar);
    return () => {
      document.removeEventListener("pointermove", gerak);
      document.removeEventListener("pointerleave", keluar);
      window.removeEventListener("blur", keluar);
      keluar();
    };
  }, []);
}
