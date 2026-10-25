"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, Pencil, Eye } from "lucide-react";
import clsx from "clsx";

type LinkRole = "editor" | "viewer";

const OPTIONS: { role: LinkRole; label: string; hint: string; icon: typeof Pencil }[] = [
  { role: "editor", label: "Can edit", hint: "Draw, move and delete", icon: Pencil },
  { role: "viewer", label: "Can view", hint: "Watch live, read-only", icon: Eye },
];

export default function ShareMenu({
  boardId,
  isOwner,
  initialLinkRole,
}: {
  boardId: string;
  isOwner: boolean;
  initialLinkRole: LinkRole;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkRole, setLinkRole] = useState<LinkRole>(initialLinkRole);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function copyLink() {
    const url = `${window.location.origin}/board/${boardId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function changeRole(next: LinkRole) {
    if (next === linkRole) return;
    const prev = linkRole;
    setLinkRole(next); // optimistic
    setError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkRole: next }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
    } catch {
      setLinkRole(prev);
      setError("Couldn't update link access. Try again.");
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-8 items-center gap-1.5 rounded-md border border-ink-faint/60 px-2 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent sm:px-2.5"
      >
        <Link2 size={13} />
        <span className="hidden sm:inline">Share</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Share board"
          className="absolute right-0 top-10 z-40 w-72 rounded-xl border border-ink-faint/50 bg-surface p-3 shadow-toolbar"
        >
          <p className="text-sm font-medium text-ink">Share this board</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {isOwner
              ? "People who open the link are added with the access below."
              : "Anyone signed in with the link can join."}
          </p>

          {isOwner && (
            <div className="mt-3 grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Link access">
              {OPTIONS.map(({ role, label, hint, icon: Icon }) => (
                <button
                  key={role}
                  role="radio"
                  aria-checked={linkRole === role}
                  onClick={() => changeRole(role)}
                  className={clsx(
                    "rounded-lg border p-2 text-left transition-colors",
                    linkRole === role
                      ? "border-accent bg-accent-soft"
                      : "border-ink-faint/60 hover:bg-canvas"
                  )}
                >
                  <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
                    <Icon size={12} /> {label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-ink-soft">{hint}</span>
                </button>
              ))}
            </div>
          )}

          {isOwner && (
            <p className="mt-2 text-[11px] text-ink-soft">
              Changes apply to new people. Anyone who already joined keeps their access.
            </p>
          )}
          {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}

          <button
            onClick={copyLink}
            className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-ink text-xs font-medium text-surface transition-opacity hover:opacity-90"
          >
            {copied ? <Check size={13} /> : <Link2 size={13} />}
            {copied ? "Link copied" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
