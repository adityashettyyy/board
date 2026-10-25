"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, WifiOff, RefreshCw } from "lucide-react";
import { useOthers } from "@/lib/liveblocks.config";
import Logo from "@/components/Logo";
import ShareMenu from "@/components/ShareMenu";

type RoomStatus = "initial" | "connecting" | "connected" | "reconnecting" | "disconnected";

export default function TopBar({
  boardId,
  name,
  onRename,
  saveState,
  readOnly,
  isOwner,
  linkRole,
  roomConnected,
  roomStatus,
}: {
  boardId: string;
  name: string;
  onRename: (name: string) => void;
  saveState: "idle" | "saving" | "saved" | "error";
  readOnly: boolean;
  isOwner: boolean;
  linkRole: "editor" | "viewer";
  roomConnected: boolean;
  roomStatus: RoomStatus;
}) {
  const others = useOthers();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setValue(name), [name]);

  function commitRename() {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setValue(name);
  }

  const visibleOthers = others.slice(0, 3);
  const overflowCount = others.length - visibleOthers.length;

  return (
    <div className="relative z-30 shrink-0">
      <header className="no-select flex h-12 items-center justify-between gap-2 border-b border-ink-faint/50 bg-surface px-2 sm:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <Link
            href="/"
            aria-label="Back to boards"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </Link>

          <div className="mx-1 hidden h-5 w-px shrink-0 bg-ink-faint/60 sm:block" aria-hidden />

          <div className="hidden sm:block">
            <Logo size={18} />
          </div>

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
              className="ml-1 w-28 min-w-0 rounded border border-accent/40 bg-canvas px-1.5 py-0.5 text-sm font-medium text-ink outline-none sm:ml-2 sm:w-48"
            />
          ) : (
            <button
              onClick={() => !readOnly && setEditing(true)}
              className="ml-1 min-w-0 max-w-[9rem] truncate rounded px-1.5 py-0.5 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:hover:bg-transparent sm:ml-2 sm:max-w-[14rem]"
              disabled={readOnly}
              title={readOnly ? name : "Rename board"}
            >
              {name}
            </button>
          )}

          <span
            className={`ml-1 hidden shrink-0 text-xs tabular-nums text-ink-soft transition-opacity sm:inline ${
              saveState === "idle" ? "opacity-0" : "opacity-100"
            } ${saveState === "error" ? "text-red-500 opacity-100" : ""}`}
          >
            {saveState === "saving" ? "Saving…" : saveState === "error" ? "Couldn't save" : "Saved"}
          </span>

          {!roomConnected && (
            <span
              title={
                roomStatus === "reconnecting"
                  ? "Reconnecting to the live board…"
                  : "Not connected — changes won't sync or save"
              }
              className="ml-1 flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
            >
              {roomStatus === "reconnecting" ? (
                <RefreshCw size={11} className="animate-spin" strokeWidth={2.5} />
              ) : (
                <WifiOff size={11} strokeWidth={2.5} />
              )}
              <span className="hidden sm:inline">
                {roomStatus === "reconnecting" ? "Reconnecting…" : "Offline"}
              </span>
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {visibleOthers.length > 0 && (
            <div className="flex -space-x-2">
              {visibleOthers.map(({ connectionId, presence }) => (
                <div
                  key={connectionId}
                  title={presence.name}
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface text-[10px] font-medium text-white"
                  style={{ backgroundColor: presence.color }}
                >
                  {presence.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              ))}
              {overflowCount > 0 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-ink-soft text-[10px] font-medium text-white">
                  +{overflowCount}
                </div>
              )}
            </div>
          )}

          <ShareMenu boardId={boardId} isOwner={isOwner} initialLinkRole={linkRole} />
        </div>
      </header>

      {saveState === "error" && (
        <div className="flex items-center justify-center gap-1.5 bg-red-50 px-3 py-1 text-xs text-red-700">
          <WifiOff size={12} strokeWidth={2.5} />
          Changes aren&apos;t saving — check your connection or try refreshing.
        </div>
      )}
    </div>
  );
}