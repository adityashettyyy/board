"use client";

import {
  MousePointer2,
  Pen,
  Square,
  Circle,
  ArrowUpRight,
  Minus,
  Type,
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
  return (
    <div
      className="no-select pointer-events-auto fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-ink-faint/50 bg-surface/95 p-1 shadow-toolbar backdrop-blur-sm"
      role="toolbar"
      aria-label="Drawing tools"
    >
      {!readOnly &&
        TOOLS.map(({ tool: t, icon: Icon, label, key }) => (
          <button
            key={t}
            aria-label={`${label} (${key})`}
            aria-pressed={tool === t}
            title={`${label} — ${key}`}
            onClick={() => onToolChange(t)}
            className={clsx(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              tool === t
                ? "bg-accent-soft text-accent"
                : "text-ink-soft hover:bg-canvas hover:text-ink"
            )}
          >
            <Icon size={17} strokeWidth={2} />
          </button>
        ))}

      {!readOnly && <div className="mx-1 h-5 w-px bg-ink-faint/50" aria-hidden />}

      {!readOnly && (
        <>
          <button
            aria-label="Undo (Cmd+Z)"
            title="Undo — ⌘Z"
            onClick={onUndo}
            disabled={!canUndo}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-canvas hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo2 size={17} strokeWidth={2} />
          </button>
          <button
            aria-label="Redo (Cmd+Shift+Z)"
            title="Redo — ⌘⇧Z"
            onClick={onRedo}
            disabled={!canRedo}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-canvas hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo2 size={17} strokeWidth={2} />
          </button>
          <div className="mx-1 h-5 w-px bg-ink-faint/50" aria-hidden />
        </>
      )}

      <button
        aria-label="Export as PNG"
        title="Export PNG"
        onClick={onExport}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
      >
        <Download size={17} strokeWidth={2} />
      </button>
    </div>
  );
}
