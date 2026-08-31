"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import type { Lson } from "@liveblocks/client";
import { nanoid } from "nanoid";
import {
  useStorage,
  useMutation,
  useUndo,
  useRedo,
  useCanUndo,
  useCanRedo,
  useSelf,
} from "@/lib/liveblocks.config";

// Konva touches browser-only APIs (canvas, Image) at import time, so the
// whole drawing surface is loaded client-side only.
const Canvas = dynamic(() => import("@/components/Canvas"), { ssr: false });
import Toolbar from "@/components/Toolbar";
import ToolOptions from "@/components/ToolOptions";
import TopBar from "@/components/TopBar";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { exportStageAsPng } from "@/lib/export-png";
import type { BoardElement, ElementData, ElementType, Tool, BoardRole } from "@/lib/types";

const AUTOSAVE_DELAY_MS = 1500;

// Liveblocks storage only accepts JSON-safe (`Lson`) values, so BoardElement
// objects are cast at the read/write boundary here rather than typed
// natively into the room's Storage generic. The runtime shape is identical —
// BoardElement is already plain JSON — this is purely a TypeScript seam.
function toLson(el: BoardElement): Lson {
  return el as unknown as Lson;
}
function fromLson(el: unknown): BoardElement {
  return el as BoardElement;
}

export default function BoardEditor({
  boardId,
  initialName,
  role,
}: {
  boardId: string;
  initialName: string;
  role: BoardRole;
}) {
  const readOnly = role === "viewer";
  const self = useSelf();
  const currentUserId = self?.id ?? "unknown";

  const elementsMap = useStorage((root) => root.elements);
  const hydrated = useRef(false);

  const [name, setName] = useState(initialName);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("#1C1B19");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const stageRef = useRef<Konva.Stage>(null);

  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  // One-time hydration: if the room storage is empty (first person to open a
  // freshly created board, or reopening after everyone left), load the last
  // saved snapshot from Postgres into Liveblocks storage.
  const hydrate = useMutation(({ storage }, saved: BoardElement[]) => {
    const map = storage.get("elements");
    if (map.size > 0) return;
    for (const el of saved) map.set(el.id, toLson(el));
  }, []);

  useEffect(() => {
    if (hydrated.current || !elementsMap) return;
    hydrated.current = true;
    if (elementsMap.size > 0) return;
    fetch(`/api/boards/${boardId}/elements`)
      .then((r) => r.json())
      .then((data: { elements: BoardElement[] }) => hydrate(data.elements ?? []))
      .catch(() => {
        /* board opens empty if the snapshot can't be loaded; not fatal */
      });
  }, [boardId, elementsMap, hydrate]);

  const elements: BoardElement[] = elementsMap
    ? Array.from(elementsMap.values())
        .map(fromLson)
        .sort((a, b) => a.zIndex - b.zIndex)
    : [];

  const addElement = useMutation(
    ({ storage }, type: ElementType, data: ElementData) => {
      const map = storage.get("elements");
      const id = nanoid();
      const maxZ = Array.from(map.values()).reduce<number>(
        (m, e) => Math.max(m, fromLson(e).zIndex),
        0
      );
      const now = new Date().toISOString();
      const element: BoardElement = {
        id,
        boardId,
        type,
        data,
        createdBy: currentUserId,
        zIndex: maxZ + 1,
        createdAt: now,
        updatedAt: now,
      };
      map.set(id, toLson(element));
      return id;
    },
    [boardId, currentUserId]
  );

  // Wrap so Canvas gets a plain synchronous function returning the new id.
  const handleAddElement = useCallback(
    (type: ElementType, data: ElementData) => {
      const id: string = addElement(type, data);
      setSelectedId(id);
      return id;
    },
    [addElement]
  );

  const updatePosition = useMutation(({ storage }, id: string, x: number, y: number) => {
    const map = storage.get("elements");
    const raw = map.get(id);
    if (!raw) return;
    const el = fromLson(raw);
    map.set(
      id,
      toLson({
        ...el,
        data: { ...el.data, x, y },
        updatedAt: new Date().toISOString(),
      })
    );
  }, []);

  const updateText = useMutation(({ storage }, id: string, text: string) => {
    const map = storage.get("elements");
    const raw = map.get(id);
    if (!raw) return;
    const el = fromLson(raw);
    if (el.type !== "text") return;

    // An empty text box (created, then clicked away from without typing)
    // shouldn't linger as an invisible ghost element on the board.
    if (text.trim() === "") {
      map.delete(id);
      return;
    }

    map.set(
      id,
      toLson({
        ...el,
        data: { ...el.data, text },
        updatedAt: new Date().toISOString(),
      })
    );
  }, []);

  const deleteElement = useMutation(({ storage }, id: string) => {
    storage.get("elements").delete(id);
  }, []);

  useKeyboardShortcuts({
    enabled: !readOnly,
    onToolChange: setTool,
    onUndo: undo,
    onRedo: redo,
    onDeleteSelection: () => {
      if (selectedId) {
        deleteElement(selectedId);
        setSelectedId(null);
      }
    },
  });

  // Debounced auto-save of the full element set to Postgres, plus a low-cost
  // thumbnail refresh so the boards list stays current.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (readOnly || !elementsMap) return;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/boards/${boardId}/elements`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ elements }),
        });
        setSaveState("saved");
        const stage = stageRef.current;
        if (stage) {
          const dataUrl = stage.toDataURL({ pixelRatio: 0.5, mimeType: "image/png" });
          fetch(`/api/boards/${boardId}/thumbnail`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl }),
          }).catch(() => {});
        }
        setTimeout(() => setSaveState("idle"), 1500);
      } catch {
        setSaveState("idle");
      }
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(elements), boardId, readOnly]);

  async function handleRename(newName: string) {
    setName(newName);
    await fetch(`/api/boards/${boardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
  }

  function handleExport() {
    const stage = stageRef.current;
    if (!stage) return;
    exportStageAsPng(stage, `${name || "board"}.png`);
  }

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-canvas">
      <TopBar
        boardId={boardId}
        name={name}
        onRename={handleRename}
        saveState={saveState}
        readOnly={readOnly}
      />

      <div className="relative min-h-0 flex-1">
        <Canvas
          elements={elements}
          tool={tool}
          onToolChange={setTool}
          color={color}
          strokeWidth={strokeWidth}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAddElement={handleAddElement}
          onUpdatePosition={updatePosition}
          onUpdateText={updateText}
          readOnly={readOnly}
          stageRef={stageRef}
          currentUserId={currentUserId}
        />

        {!readOnly && tool !== "select" && (
          <ToolOptions
            color={color}
            onColorChange={setColor}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={setStrokeWidth}
          />
        )}

        <Toolbar
          tool={tool}
          onToolChange={setTool}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onExport={handleExport}
          readOnly={readOnly}
        />
      </div>
    </main>
  );
}