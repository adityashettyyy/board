"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { relativeTime } from "@/lib/relative-time";
import type { Board } from "@/lib/types";

export default function BoardCard({
  board,
  isOwner,
}: {
  board: Board;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(board.name);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  async function commitRename() {
    setEditing(false);
    const trimmed = name.trim();
    if (!trimmed || trimmed === board.name) {
      setName(board.name);
      return;
    }
    await fetch(`/api/boards/${board.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    router.refresh();
  }

  async function handleDelete() {
    setBusy(true);
    const res = await fetch(`/api/boards/${board.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    setBusy(false);
    setConfirmingDelete(false);
    setMenuOpen(false);
  }

  return (
    <li className="group relative">
      <Link
        href={`/board/${board.id}`}
        onClick={(e) => {
          if (editing || menuOpen) e.preventDefault();
        }}
        className="flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 transition-colors hover:border-ink-faint/60 hover:bg-surface"
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded overflow-hidden text-xs font-semibold text-white"
          style={{ backgroundColor: colorFromId(board.id) }}
        >
          {board.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={board.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            board.name.slice(0, 1).toUpperCase()
          )}
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              ref={inputRef}
              value={name}
              autoFocus
              onClick={(e) => e.preventDefault()}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setName(board.name);
                  setEditing(false);
                }
              }}
              className="w-full max-w-xs rounded border border-accent/40 bg-canvas px-1.5 py-0.5 text-sm font-medium text-ink outline-none"
            />
          ) : (
            <p className="truncate text-sm font-medium text-ink">{board.name}</p>
          )}
          <p className="text-xs text-ink-soft">Updated {relativeTime(board.updatedAt)}</p>
        </div>
      </Link>

      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        {confirmingDelete ? (
          <div className="flex items-center gap-1.5 rounded-md border border-ink-faint/60 bg-surface px-2 py-1 shadow-sm">
            <span className="text-xs text-ink-soft">Delete?</span>
            <button
              disabled={busy}
              onClick={handleDelete}
              className="rounded px-1.5 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              {busy ? "…" : "Delete"}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="rounded px-1.5 py-0.5 text-xs text-ink-soft hover:bg-canvas"
            >
              Cancel
            </button>
          </div>
        ) : menuOpen ? (
          <div ref={menuRef} className="flex items-center gap-1 rounded-md border border-ink-faint/60 bg-surface p-1 shadow-sm">
            <button
              onClick={() => {
                setMenuOpen(false);
                setEditing(true);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              aria-label="Rename board"
              className="flex h-6 w-6 items-center justify-center rounded text-ink-soft hover:bg-canvas hover:text-ink"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete board"
              className="flex h-6 w-6 items-center justify-center rounded text-ink-soft hover:bg-red-50 hover:text-red-600"
              hidden={!isOwner}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Board options"
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-soft opacity-0 transition-opacity hover:bg-canvas hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
          >
            <MoreHorizontal size={15} />
          </button>
        )}
      </div>
    </li>
  );
}

/** Deterministic swatch color for boards with no thumbnail yet, from the same presence palette. */
function colorFromId(id: string): string {
  const palette = ["#1C6E8C", "#E8735C", "#8B5FBF", "#4E8F52", "#CC9A2E"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  return palette[Math.abs(hash) % palette.length];
}