import { useRef, type ReactNode, type MouseEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function SpotlightCard({ children, className, onClick }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--y", `${e.clientY - rect.top}px`);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      if (e.key === " ") e.preventDefault();
      onClick?.();
    }
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(200px circle at var(--x, 50%) var(--y, 50%), rgba(46,95,163,0.15), transparent 80%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
