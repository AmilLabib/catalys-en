import { CalendarRange, ArrowRight } from "lucide-react";
import { HARI_INI, TANGGAL_MIN } from "../data/laporan";

// Pemilih periode laporan: cukup dua tanggal, dari dan sampai.
export default function PilihPeriode({
  dari,
  sampai,
  onUbah,
}: {
  dari: string;
  sampai: string;
  onUbah: (dari: string, sampai: string) => void;
}) {
  const input = "rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm font-medium text-primary outline-none focus:ring-2 focus:ring-primary/15";

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm shadow-sm">
      <CalendarRange className="w-4 h-4 text-primary" />
      <label className="inline-flex items-center gap-1.5">
        <span className="sr-only">Dari tanggal</span>
        <input
          type="date"
          value={dari}
          min={TANGGAL_MIN}
          max={sampai}
          onChange={(e) => e.target.value && onUbah(e.target.value, sampai)}
          className={input}
          aria-label="Dari tanggal"
        />
      </label>
      <ArrowRight className="w-4 h-4 text-gray-400" />
      <label className="inline-flex items-center gap-1.5">
        <span className="sr-only">Sampai tanggal</span>
        <input
          type="date"
          value={sampai}
          min={dari}
          max={HARI_INI}
          onChange={(e) => e.target.value && onUbah(dari, e.target.value)}
          className={input}
          aria-label="Sampai tanggal"
        />
      </label>
    </div>
  );
}
