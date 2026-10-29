import { useId } from "react";
import { motion } from "motion/react";
import { Lock, type LucideIcon } from "lucide-react";

// Pill-shaped tab navigation (same style as the MSME Growth page).
// The active tab background slides smoothly to the selected tab. Tabs with `locked`
// render normally with a padlock icon; clicking calls `onLocked` (e.g. an explanation popup).
export default function PillTabs<K extends string>({
  tabs,
  active,
  onChange,
  onLocked,
  className = "",
}: {
  tabs: readonly { key: K; label: string; icon?: LucideIcon; locked?: string }[];
  active: K;
  onChange: (k: K) => void;
  onLocked?: (k: K) => void;
  className?: string;
}) {
  const indicatorId = useId();
  return (
    <div className={`flex flex-wrap gap-2 ${className}`} role="tablist">
      {tabs.map((t) => {
        const Icon = t.icon;
        const on = active === t.key;
        if (t.locked)
          return (
            <button
              key={t.key}
              role="tab"
              aria-disabled
              title={t.locked}
              onClick={() => onLocked?.(t.key)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 bg-white/80 text-sm font-medium text-gray-700 hover:bg-white"
            >
              {Icon && <Icon className="w-4 h-4" />}
              {t.label}
              <Lock className="w-3.5 h-3.5 text-gray-400" />
            </button>
          );
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
              on ? "text-white border-transparent" : "bg-white/80 backdrop-blur text-gray-700 border-gray-300 hover:bg-white"
            }`}
          >
            {on && (
              <motion.span
                layoutId={indicatorId}
                className="active-indicator rounded-full"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {Icon && <Icon className="relative w-4 h-4" />}
            <span className="relative">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
