import { useEffect, useRef } from "react";
import { animate, useInView } from "motion/react";
import { kurangiGerak } from "../utils/efek";

// Angka yang "berputar naik" dari 0 ke nilainya saat pertama terlihat,
// lalu beranimasi halus setiap kali nilainya berubah.
export default function AngkaBerjalan({
  nilai,
  format,
  durasi = 1.2,
  className,
}: {
  nilai: number;
  format: (v: number) => string;
  durasi?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const terlihat = useInView(ref, { once: true });
  const sebelumnya = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !terlihat) return;
    if (kurangiGerak()) {
      el.textContent = format(nilai);
      sebelumnya.current = nilai;
      return;
    }
    const kontrol = animate(sebelumnya.current, nilai, {
      duration: durasi,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = format(Math.round(v));
      },
    });
    sebelumnya.current = nilai;
    return () => kontrol.stop();
  }, [nilai, terlihat, format, durasi]);

  return (
    <span ref={ref} className={className} title={format(nilai)}>
      {format(0)}
    </span>
  );
}
