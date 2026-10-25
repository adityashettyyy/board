"use client";

import clsx from "clsx";

const COLORS = ["#1C1B19", "#1C6E8C", "#E8735C", "#4E8F52", "#CC9A2E"];
const FILLS = ["#1C6E8C", "#E8735C", "#4E8F52", "#CC9A2E", "#F2F1EC"];
const WEIGHTS = [2, 4, 8];

export default function ToolOptions({
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  showFill = false,
  showStroke = true,
  fill,
  onFillChange,
}: {
  color: string;
  onColorChange: (c: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (w: number) => void;
  // Fill only makes sense for closed shapes (rectangle/ellipse) — the parent
  // decides when to render this section rather than every drawing tool
  // showing an irrelevant fill swatch.
  showFill?: boolean;
  // Text has no stroke weight; hide the control rather than show a dead one.
  showStroke?: boolean;
  fill?: string | null;
  onFillChange?: (f: string | null) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[3.75rem] z-30 flex justify-center px-2 sm:bottom-[4.75rem]">
      <div className="no-select no-scrollbar pointer-events-auto flex max-w-full items-center gap-2 overflow-x-auto rounded-xl border border-ink-faint/50 bg-surface/95 px-2.5 py-1.5 shadow-toolbar backdrop-blur-sm">
        <div className="flex shrink-0 items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              onClick={() => onColorChange(c)}
              className={clsx(
                "h-5 w-5 shrink-0 rounded-full ring-offset-2 ring-offset-surface transition-shadow",
                color === c && "ring-2 ring-accent"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        {showStroke && (
        <>
        <div className="h-4 w-px shrink-0 bg-ink-faint/50" aria-hidden />
        <div className="flex shrink-0 items-center gap-1.5">
          {WEIGHTS.map((w) => (
            <button
              key={w}
              aria-label={`Stroke weight ${w}`}
              aria-pressed={strokeWidth === w}
              onClick={() => onStrokeWidthChange(w)}
              className={clsx(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors",
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
        </>
        )}

        {showFill && onFillChange && (
          <>
            <div className="h-4 w-px shrink-0 bg-ink-faint/50" aria-hidden />
            <div className="flex shrink-0 items-center gap-1">
              <button
                aria-label="No fill"
                aria-pressed={!fill}
                title="No fill"
                onClick={() => onFillChange(null)}
                className={clsx(
                  "relative h-5 w-5 shrink-0 rounded-full border border-ink-faint bg-transparent transition-shadow",
                  !fill && "ring-2 ring-accent ring-offset-2 ring-offset-surface"
                )}
              >
                <span className="absolute left-1/2 top-1/2 h-[1.5px] w-[130%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-ink-faint" />
              </button>
              {FILLS.map((f) => (
                <button
                  key={f}
                  aria-label={`Fill ${f}`}
                  aria-pressed={fill === f}
                  onClick={() => onFillChange(f)}
                  className={clsx(
                    "h-5 w-5 shrink-0 rounded-full ring-offset-2 ring-offset-surface transition-shadow",
                    fill === f && "ring-2 ring-accent"
                  )}
                  style={{ backgroundColor: f }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}