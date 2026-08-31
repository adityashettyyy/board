"use client";

import { useEffect } from "react";
import type { Tool } from "@/lib/types";

interface Options {
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelection: () => void;
  enabled: boolean;
}

const KEY_TO_TOOL: Record<string, Tool> = {
  v: "select",
  p: "pen",
  r: "rectangle",
  o: "ellipse",
  a: "arrow",
  l: "line",
  t: "text",
};

export function useKeyboardShortcuts({
  onToolChange,
  onUndo,
  onRedo,
  onDeleteSelection,
  enabled,
}: Options) {
  useEffect(() => {
    if (!enabled) return;

    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      );
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
        return;
      }

      if ((e.key === "Backspace" || e.key === "Delete") && !mod) {
        e.preventDefault();
        onDeleteSelection();
        return;
      }

      const tool = KEY_TO_TOOL[e.key.toLowerCase()];
      if (tool && !mod) {
        e.preventDefault();
        onToolChange(tool);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onToolChange, onUndo, onRedo, onDeleteSelection]);
}
