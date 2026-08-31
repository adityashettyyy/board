"use client";

import clsx from "clsx";

const COLORS = ["#1C1B19", "#1C6E8C", "#E8735C", "#4E8F52", "#CC9A2E"];
const WEIGHTS = [2, 4, 8];

export default function ToolOptions({
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
}: {
  color: string;
  onColorChange: (c: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (w: number) => void;
}) {
  return (
    <div className="no-select pointer-events-auto fixed bottom-[4.75rem] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-ink-faint/50 bg-surface/95 px-2.5 py-1.5 shadow-toolbar backdrop-blur-sm">
      <div className="flex items-center gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            aria-label={`Color ${c}`}
            aria-pressed={color === c}
            onClick={() => onColorChange(c)}
            className={clsx(
              "h-5 w-5 rounded-full ring-offset-2 ring-offset-surface transition-shadow",
              color === c && "ring-2 ring-accent"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="h-4 w-px bg-ink-faint/50" aria-hidden />
      <div className="flex items-center gap-1.5">
        {WEIGHTS.map((w) => (
          <button
            key={w}
            aria-label={`Stroke weight ${w}`}
            aria-pressed={strokeWidth === w}
            onClick={() => onStrokeWidthChange(w)}
            className={clsx(
              "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
              strokeWidth === w ? "bg-accent-soft" : "hover:bg-canvas"
            )}
          >
            <span
              className="rounded-full bg-ink"
              style={{ width: w, height: w }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
