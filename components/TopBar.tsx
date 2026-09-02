"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Link2, Check } from "lucide-react";
import { useOthers } from "@/lib/liveblocks.config";
import Logo from "@/components/Logo";

export default function TopBar({
  boardId,
  name,
  onRename,
  saveState,
  readOnly,
}: {
  boardId: string;
  name: string;
  onRename: (name: string) => void;
  saveState: "idle" | "saving" | "saved";
  readOnly: boolean;
}) {
  const others = useOthers();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setValue(name), [name]);

  function commitRename() {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setValue(name);
  }

  function copyLink() {
    const url = `${window.location.origin}/board/${boardId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <header className="no-select relative z-30 flex h-12 shrink-0 items-center justify-between border-b border-ink-faint/50 bg-surface px-3">
      <div className="flex min-w-0 items-center gap-1">
        <Link
          href="/"
          aria-label="Back to boards"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
        >
          <ArrowLeft size={16} strokeWidth={2} />
        </Link>

        <div className="mx-1 h-5 w-px shrink-0 bg-ink-faint/60" aria-hidden />

        <Logo size={18} />

        {editing ? (
          <input
            ref={inputRef}
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setValue(name);
                setEditing(false);
              }
            }}
            className="ml-2 w-48 rounded border border-accent/40 bg-canvas px-1.5 py-0.5 text-sm font-medium text-ink outline-none"
          />
        ) : (
          <button
            onClick={() => !readOnly && setEditing(true)}
            className="ml-2 max-w-[14rem] truncate rounded px-1.5 py-0.5 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:hover:bg-transparent"
            disabled={readOnly}
            title={readOnly ? name : "Rename board"}
          >
            {name}
          </button>
        )}

        <span
          className={`ml-1 shrink-0 text-xs tabular-nums text-ink-soft transition-opacity ${
            saveState === "idle" ? "opacity-0" : "opacity-100"
          }`}
        >
          {saveState === "saving" ? "Saving…" : "Saved"}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex -space-x-2">
          {others.slice(0, 5).map(({ connectionId, presence }) => (
            <div
              key={connectionId}
              title={presence.name}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface text-[10px] font-medium text-white"
              style={{ backgroundColor: presence.color }}
            >
              {presence.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          ))}
        </div>

        <button
          onClick={copyLink}
          className="flex h-8 items-center gap-1.5 rounded-md border border-ink-faint/60 px-2.5 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent"
        >
          {copied ? <Check size={13} /> : <Link2 size={13} />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </header>
  );
}
