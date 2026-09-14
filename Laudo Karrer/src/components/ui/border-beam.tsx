import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface BorderBeamProps {
  className?: string;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
}

export function BorderBeam({
  className,
  duration = 6,
  colorFrom = "#2E5FA3",
  colorTo = "#1B3A6B",
}: BorderBeamProps) {
  return (
    <div
      data-testid="border-beam"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]",
        className,
      )}
      style={{ "--duration": `${duration}s` } as CSSProperties}
    >
      <div
        className="absolute left-1/2 top-1/2 h-[200%] w-[200%] animate-border-beam-spin"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, transparent 300deg, ${colorFrom} 330deg, ${colorTo} 345deg, transparent 360deg)`,
          transformOrigin: "50% 50%",
          marginLeft: "-100%",
          marginTop: "-100%",
        }}
      />
      <div className="absolute inset-[1.5px] rounded-[inherit] bg-white" />
    </div>
  );
}
