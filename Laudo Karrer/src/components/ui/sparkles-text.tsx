import { useMemo, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SparklesTextProps {
  children: ReactNode;
  className?: string;
  sparkleCount?: number;
  colors?: { first: string; second: string };
}

interface Sparkle {
  id: number;
  top: string;
  left: string;
  size: number;
  delay: string;
  color: string;
}

function generateSparkles(count: number, colors: { first: string; second: string }): Sparkle[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: 8 + Math.random() * 8,
    delay: `${(Math.random() * 2).toFixed(2)}s`,
    color: id % 2 === 0 ? colors.first : colors.second,
  }));
}

export function SparklesText({
  children,
  className,
  sparkleCount = 8,
  colors = { first: "#2E5FA3", second: "#1B3A6B" },
}: SparklesTextProps) {
  const sparkles = useMemo(
    () => generateSparkles(sparkleCount, colors),
    [sparkleCount, colors.first, colors.second],
  );

  return (
    <span className={cn("relative inline-block", className)}>
      {sparkles.map((sparkle) => (
        <span
          key={sparkle.id}
          aria-hidden="true"
          className="absolute animate-sparkle-pulse"
          style={
            {
              top: sparkle.top,
              left: sparkle.left,
              width: sparkle.size,
              height: sparkle.size,
              animationDelay: sparkle.delay,
              color: sparkle.color,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 160 160" fill="currentColor" className="h-full w-full">
            <path d="M80 0c4 40 8 76 12 84 8 4 44 8 84 12-40 4-76 8-84 12-4 8-8 44-12 84-4-40-8-76-12-84-8-4-44-8-84-12 40-4 76-8 84-12 4-8 8-44 12-84Z" />
          </svg>
        </span>
      ))}
      <strong className="relative z-10 font-semibold">{children}</strong>
    </span>
  );
}
