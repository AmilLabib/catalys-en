import { Coins } from "lucide-react";
import { useAccount } from "../context/AccountContext";
import { PERIOD_LABEL, QUOTA_INFO, type QuotaKey } from "../config/access";

// Small badge showing remaining tokens, placed next to its feature's button.
export default function QuotaBadge({
  quota,
  className = "",
}: {
  quota: QuotaKey;
  className?: string;
}) {
  const { quotaLimit, quotaRemaining, quotaPeriod } = useAccount();
  const limit = quotaLimit(quota);
  const remaining = quotaRemaining(quota);
  const info = QUOTA_INFO[quota];
  const period = quotaPeriod(quota);

  if (limit === null || remaining === null) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ${className}`}
      >
        <Coins className="w-3.5 h-3.5" /> {info.label}: unlimited
      </span>
    );
  }

  const ratio = limit === 0 ? 0 : remaining / limit;
  const tone =
    remaining === 0
      ? "bg-red-50 text-red-700 ring-red-200"
      : ratio < 0.2
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-blue-50 text-blue-700 ring-blue-200";

  return (
    <span
      title={`${info.label}: ${remaining} of ${limit} left (${PERIOD_LABEL[period]})`}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${tone} ${className}`}
    >
      <Coins className="w-3.5 h-3.5" />
      {remaining}/{limit} left {period === "daily" ? PERIOD_LABEL.daily : ""}
      {remaining === 0 && " · used up"}
    </span>
  );
}
