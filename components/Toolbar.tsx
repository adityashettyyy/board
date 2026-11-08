"use client";

import {
  MousePointer2,
  Pen,
  Square,
  Circle,
  ArrowUpRight,
  Minus,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Download,
} from "lucide-react";
import clsx from "clsx";
import type { Tool } from "@/lib/types";

const TOOLS: { tool: Tool; icon: typeof MousePointer2; label: string; key: string }[] = [
  { tool: "select", icon: MousePointer2, label: "Select", key: "V" },
  { tool: "pen", icon: Pen, label: "Draw", key: "P" },
  { tool: "rectangle", icon: Square, label: "Rectangle", key: "R" },
  { tool: "ellipse", icon: Circle, label: "Ellipse", key: "O" },
  { tool: "arrow", icon: ArrowUpRight, label: "Arrow", key: "A" },
  { tool: "line", icon: Minus, label: "Line", key: "L" },
  { tool: "text", icon: Type, label: "Text", key: "T" },
  { tool: "eraser", icon: Eraser, label: "Eraser", key: "E" },
];

export default function Toolbar({
  tool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  readOnly,
}: {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  readOnly: boolean;
}) {
  const activeIndex = TOOLS.findIndex((t) => t.tool === tool);
  const iconBtn =
    "press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-canvas hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent sm:h-9 sm:w-9";

  return (
    <div
      className="no-select pointer-events-none fixed inset-x-0 bottom-3 z-30 flex justify-center px-2 sm:bottom-5"
    >
      <div
        className="no-scrollbar pointer-events-auto flex max-w-full animate-slide-up items-center gap-0.5 overflow-x-auto rounded-xl border border-ink-faint/50 bg-surface/95 p-1 shadow-lift backdrop-blur-md"
        role="toolbar"
        aria-label="Drawing tools"
      >
        {!readOnly && (
          <div className="relative flex items-center gap-0.5 [--b:2rem] sm:[--b:2.25rem]">
            {/* Sliding highlight: moves between tools instead of snapping. */}
            {activeIndex >= 0 && (
              <span
                aria-hidden
                className="absolute left-0 top-0 h-[var(--b)] w-[var(--b)] rounded-lg bg-accent-soft transition-transform duration-300 ease-spring"
                style={{
                  transform: `translateX(calc(${activeIndex} * (var(--b) + 0.125rem)))`,
                }}
              />
            )}
            {TOOLS.map(({ tool: t, icon: Icon, label, key }) => {
              const active = tool === t;
              return (
                <button
                  key={t}
                  aria-label={`${label} (${key})`}
                  aria-pressed={active}
                  title={`${label} — ${key}`}
                  onClick={() => onToolChange(t)}
                  className={clsx(
                    "press relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9",
                    active ? "text-accent" : "text-ink-soft hover:text-ink"
                  )}
                >
                  <span
                    key={active ? "on" : "off"}
                    className={clsx("flex", active && "animate-tool-pop")}
                  >
                    <Icon size={17} strokeWidth={2} />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {!readOnly && <div className="mx-1 h-5 w-px shrink-0 bg-ink-faint/50" aria-hidden />}

        {!readOnly && (
          <>
            <button
              aria-label="Undo (Cmd+Z)"
              title="Undo — ⌘Z"
              onClick={onUndo}
              disabled={!canUndo}
              className={iconBtn}
            >
              <Undo2 size={17} strokeWidth={2} />
            </button>
            <button
              aria-label="Redo (Cmd+Shift+Z)"
              title="Redo — ⌘⇧Z"
              onClick={onRedo}
              disabled={!canRedo}
              className={iconBtn}
            >
              <Redo2 size={17} strokeWidth={2} />
            </button>
            <div className="mx-1 h-5 w-px shrink-0 bg-ink-faint/50" aria-hidden />
          </>
        )}

        <button
          aria-label="Export as PNG"
          title="Export PNG"
          onClick={onExport}
          className={iconBtn}
        >
          <Download size={17} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}