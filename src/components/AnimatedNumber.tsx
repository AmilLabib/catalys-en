import { useEffect, useRef } from "react";
import { animate, useInView } from "motion/react";
import { prefersReducedMotion } from "../utils/effects";

// A number that "counts up" from 0 to its value when first visible,
// then animates smoothly whenever the value changes.
export default function AnimatedNumber({
  value,
  format,
  duration = 1.2,
  className,
}: {
  value: number;
  format: (v: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const visible = useInView(ref, { once: true });
  const previous = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !visible) return;
    if (prefersReducedMotion()) {
      el.textContent = format(value);
      previous.current = value;
      return;
    }
    const controls = animate(previous.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = format(Math.round(v));
      },
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, visible, format, duration]);

  return (
    <span ref={ref} className={className} title={format(value)}>
      {format(0)}
    </span>
  );
}
