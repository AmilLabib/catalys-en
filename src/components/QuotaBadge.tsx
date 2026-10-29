import { Coins } from "lucide-react";
import { useAccount } from "../context/AccountContext";
import { PERIODE_LABEL, QUOTA_INFO, type QuotaKey } from "../config/access";

// Label kecil sisa token yang ditaruh di dekat tombol fiturnya.
export default function QuotaBadge({
  kuota,
  className = "",
}: {
  kuota: QuotaKey;
  className?: string;
}) {
  const { quotaLimit, quotaRemaining, quotaPeriode } = useAccount();
  const limit = quotaLimit(kuota);
  const sisa = quotaRemaining(kuota);
  const info = QUOTA_INFO[kuota];
  const periode = quotaPeriode(kuota);

  if (limit === null || sisa === null) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ${className}`}
      >
        <Coins className="w-3.5 h-3.5" /> {info.label}: tanpa batas
      </span>
    );
  }

  const rasio = limit === 0 ? 0 : sisa / limit;
  const tone =
    sisa === 0
      ? "bg-red-50 text-red-700 ring-red-200"
      : rasio < 0.2
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-blue-50 text-blue-700 ring-blue-200";

  return (
    <span
      title={`${info.label} tersisa ${sisa} dari ${limit} (${PERIODE_LABEL[periode]})`}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${tone} ${className}`}
    >
      <Coins className="w-3.5 h-3.5" />
      Sisa {sisa}/{limit} {periode === "harian" ? PERIODE_LABEL.harian : ""}
      {sisa === 0 && " · habis"}
    </span>
  );
}
