import { CalendarRange, ArrowRight } from "lucide-react";
import { TODAY, MIN_DATE } from "../data/reports";

// Report period picker: just two dates, from and to.
export default function PeriodPicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const input = "rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm font-medium text-primary outline-none focus:ring-2 focus:ring-primary/15";

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm shadow-sm">
      <CalendarRange className="w-4 h-4 text-primary" />
      <label className="inline-flex items-center gap-1.5">
        <span className="sr-only">From date</span>
        <input
          type="date"
          value={from}
          min={MIN_DATE}
          max={to}
          onChange={(e) => e.target.value && onChange(e.target.value, to)}
          className={input}
          aria-label="From date"
        />
      </label>
      <ArrowRight className="w-4 h-4 text-gray-400" />
      <label className="inline-flex items-center gap-1.5">
        <span className="sr-only">To date</span>
        <input
          type="date"
          value={to}
          min={from}
          max={TODAY}
          onChange={(e) => e.target.value && onChange(from, e.target.value)}
          className={input}
          aria-label="To date"
        />
      </label>
    </div>
  );
}
