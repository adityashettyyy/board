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
  useStatus,
} from "@/lib/liveblocks.config";

const Canvas = dynamic(() => import("@/components/Canvas"), { ssr: false });
import Toolbar from "@/components/Toolbar";
import ToolOptions from "@/components/ToolOptions";
import TopBar from "@/components/TopBar";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { exportStageAsPng, generateThumbnailDataUrl } from "@/lib/export-png";
import type { BoardElement, ElementData, ElementType, Tool, BoardRole } from "@/lib/types";

const AUTOSAVE_DELAY_MS = 1500;

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
  linkRole,
}: {
  boardId: string;
  initialName: string;
  role: BoardRole;
  linkRole: "editor" | "viewer";
}) {
  const readOnly = role === "viewer";
  const self = useSelf();
  const currentUserId = self?.id ?? "unknown";
  const status = useStatus();
  const roomConnected = status === "connected";

  const elementsMap = useStorage((root) => root.elements);
  const storageLoaded = elementsMap !== null;
  const hydrated = useRef(false);
  // Autosave must never run before the saved snapshot has been loaded into
  // the room — otherwise an empty room would be PUT and wipe the database.
  const [snapshotReady, setSnapshotReady] = useState(false);

  const [name, setName] = useState(initialName);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("#1C1B19");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [fill, setFill] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
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
    if (elementsMap.size > 0) {
      setSnapshotReady(true);
      return;
    }
    fetch(`/api/boards/${boardId}/elements`)
      .then((r) => {
        if (!r.ok) throw new Error(`Load failed (${r.status})`);
        return r.json();
      })
      .then((data: { elements: BoardElement[] }) => {
        hydrate(data.elements ?? []);
        setSnapshotReady(true);
      })
      .catch((err) => {
        // Leave autosave disabled: saving from an unhydrated (empty) room
        // would overwrite the stored board with nothing.
        console.error("[BoardEditor] Could not load saved board:", err);
        setSaveState("error");
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
    enabled: !readOnly && storageLoaded,
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
    if (readOnly || !elementsMap || !snapshotReady) return;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/boards/${boardId}/elements`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ elements }),
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
        setSaveState("saved");
        const stage = stageRef.current;
        if (stage) {
          const dataUrl = generateThumbnailDataUrl(stage, elements);
          fetch(`/api/boards/${boardId}/thumbnail`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl }),
          }).catch(() => {
            /* thumbnail is a nice-to-have; the board save above already succeeded */
          });
        }
        setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1500);
      } catch (err) {
        console.error("[BoardEditor] Autosave failed:", err);
        setSaveState("error");
      }
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(elements), boardId, readOnly, snapshotReady]);

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
    exportStageAsPng(stage, `${name || "board"}.png`, elements);
  }

  const handleDeleteElement = useCallback(
    (id: string) => {
      deleteElement(id);
      setSelectedId((s) => (s === id ? null : s));
    },
    [deleteElement]
  );

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-canvas">
      <TopBar
        boardId={boardId}
        name={name}
        onRename={handleRename}
        saveState={saveState}
        readOnly={readOnly}
        isOwner={role === "owner"}
        linkRole={linkRole}
        roomConnected={roomConnected}
        roomStatus={status}
      />

      <div className="relative min-h-0 flex-1">
        <Canvas
          elements={elements}
          tool={tool}
          onToolChange={setTool}
          color={color}
          strokeWidth={strokeWidth}
          fill={fill}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAddElement={handleAddElement}
          onUpdatePosition={updatePosition}
          onUpdateText={updateText}
          onDeleteElement={handleDeleteElement}
          readOnly={readOnly || !storageLoaded}
          stageRef={stageRef}
          currentUserId={currentUserId}
        />

        {!storageLoaded && (
          <div
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-canvas/60"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 rounded-lg border border-ink-faint/50 bg-surface px-3 py-2 text-sm text-ink-soft shadow-toolbar">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-faint border-t-accent" />
              Loading board…
            </div>
          </div>
        )}

        {!readOnly && storageLoaded && tool !== "select" && (
          <ToolOptions
            color={color}
            onColorChange={setColor}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={setStrokeWidth}
            showStroke={tool !== "text"}
            showFill={tool === "rectangle" || tool === "ellipse"}
            fill={fill}
            onFillChange={setFill}
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
          readOnly={readOnly || !storageLoaded}
        />
      </div>
    </main>
  );
}