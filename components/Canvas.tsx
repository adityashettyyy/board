"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import ElementRenderer from "@/components/ElementRenderer";
import SelectionOutline from "@/components/SelectionOutline";
import Cursors from "@/components/Cursors";
import { useUpdateMyPresence } from "@/lib/liveblocks.config";
import { getElementBounds, TEXT_LINE_HEIGHT } from "@/lib/bounds";
import type {
  BoardElement,
  ElementData,
  ElementType,
  PathElementData,
  ShapeElementData,
  LineElementData,
  TextElementData,
  Tool,
} from "@/lib/types";

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const TEXT_FONT_SIZE = 20;
const TEXT_BOX_WIDTH = 260;

interface TextEdit {
  /** null while composing a brand-new text element that doesn't exist yet. */
  id: string | null;
  x: number;
  y: number;
  value: string;
  original: string;
  color: string;
  fontSize: number;
  width: number;
}

/** Tools that create a drawn element via drag (as opposed to "select"). */
type DraftTool = "pen" | "rectangle" | "ellipse" | "arrow" | "line";

function draftToElementType(t: DraftTool): ElementType {
  return t === "pen" ? "path" : t;
}

export interface CanvasHandle {
  stage: Konva.Stage | null;
}

export default function Canvas({
  elements,
  tool,
  onToolChange,
  color,
  strokeWidth,
  fill,
  selectedId,
  onSelect,
  onAddElement,
  onUpdatePosition,
  onUpdateText,
  onDeleteElement,
  readOnly,
  stageRef,
  currentUserId,
}: {
  elements: BoardElement[];
  tool: Tool;
  onToolChange: (t: Tool) => void;
  color: string;
  strokeWidth: number;
  fill: string | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddElement: (type: ElementType, data: ElementData) => string;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateText: (id: string, text: string) => void;
  onDeleteElement: (id: string) => void;
  readOnly: boolean;
  stageRef: React.RefObject<Konva.Stage>;
  currentUserId: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState({ scale: 1, x: 0, y: 0 });
  const updateMyPresence = useUpdateMyPresence();

  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const isDrawing = useRef(false);
  const isErasing = useRef(false);
  const pendingText = useRef<{ x: number; y: number } | null>(null);
  const [editingText, setEditingText] = useState<TextEdit | null>(null);
  const editingRef = useRef<TextEdit | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState<{
    type: DraftTool;
    startX: number;
    startY: number;
    points?: number[];
    width?: number;
    height?: number;
  } | null>(null);

  // Size the stage to its container and keep it in sync on resize.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Space bar enables temporary pan mode, matching common design-tool convention.
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.code === "Space" && !(e.target instanceof HTMLTextAreaElement)) {
        setIsSpaceDown(true);
      }
    }
    function up(e: KeyboardEvent) {
      if (e.code === "Space") setIsSpaceDown(false);
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const toWorld = useCallback(
    (screenX: number, screenY: number) => ({
      x: (screenX - viewport.x) / viewport.scale,
      y: (screenY - viewport.y) / viewport.scale,
    }),
    [viewport]
  );

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      if (e.evt.ctrlKey || e.evt.metaKey) {
        // Pinch-to-zoom (trackpad) or ctrl+wheel: zoom around the pointer.
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const oldScale = viewport.scale;
        const direction = e.evt.deltaY > 0 ? -1 : 1;
        const newScale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, oldScale * (1 + direction * 0.08))
        );
        const worldPoint = {
          x: (pointer.x - viewport.x) / oldScale,
          y: (pointer.y - viewport.y) / oldScale,
        };
        setViewport({
          scale: newScale,
          x: pointer.x - worldPoint.x * newScale,
          y: pointer.y - worldPoint.y * newScale,
        });
      } else {
        // Two-finger scroll: pan.
        setViewport((v) => ({ ...v, x: v.x - e.evt.deltaX, y: v.y - e.evt.deltaY }));
      }
    },
    [viewport, stageRef]
  );

  function newShapeData(
    startX: number,
    startY: number,
    x: number,
    y: number
  ): { x: number; y: number; width: number; height: number } {
    return {
      x: Math.min(startX, x),
      y: Math.min(startY, y),
      width: Math.abs(x - startX),
      height: Math.abs(y - startY),
    };
  }

  function openTextEditor(edit: TextEdit) {
    editingRef.current = edit;
    setEditingText(edit);
  }

  function commitText(cancel = false) {
    const edit = editingRef.current;
    if (!edit) return; // already committed (Enter then blur, etc.)
    editingRef.current = null;
    setEditingText(null);

    const text = (cancel ? edit.original : edit.value).replace(/\s+$/, "");
    if (edit.id) {
      if (!text) onDeleteElement(edit.id);
      else if (text !== edit.original) onUpdateText(edit.id, text);
    } else if (text) {
      onAddElement("text", {
        x: edit.x,
        y: edit.y,
        color: edit.color,
        strokeWidth: 0,
        text,
        fontSize: edit.fontSize,
        width: edit.width,
      } satisfies TextElementData);
    }
    if (tool === "text") onToolChange("select");
  }

  function startEditingExisting(id: string) {
    if (readOnly || tool !== "select") return;
    const el = elements.find((e) => e.id === id);
    if (!el || el.type !== "text") return;
    const d = el.data as TextElementData;
    openTextEditor({
      id,
      x: d.x,
      y: d.y,
      value: d.text,
      original: d.text,
      color: d.color,
      fontSize: d.fontSize,
      width: d.width,
    });
  }

  // Focus after mount; autoFocus alone loses to the canvas reclaiming focus.
  useEffect(() => {
    if (!editingText) return;
    const t = setTimeout(() => {
      const el = textAreaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      el.style.height = `${el.scrollHeight}px`;
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingText?.id, editingText?.x, editingText?.y]);

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (readOnly) return;
      if (e.evt.type.startsWith("touch")) {
        e.evt.preventDefault();
      }
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const clickedOnEmpty = e.target === stage;

      if (isSpaceDown || tool === "select") {
        if (clickedOnEmpty) onSelect(null);
        return;
      }

      if (tool === "text") {
        // The editor opens on mouse-up, after the browser has finished its
        // own focus handling for this click; opening it here loses the race
        // and the textarea blurs (and commits) immediately.
        pendingText.current = toWorld(pointer.x, pointer.y);
        return;
      }

      if (tool === "eraser") {
        isErasing.current = true;
        if (!clickedOnEmpty) {
          const id = e.target.id();
          if (id) onDeleteElement(id);
        }
        return;
      }

      // Any drawing tool: place the new element wherever the pointer is,
      // even if that's on top of an existing shape — only "select" needs
      // to distinguish empty canvas from a hit on existing content.
      {
        const world = toWorld(pointer.x, pointer.y);
        isDrawing.current = true;

        setDraft({
          type: tool as DraftTool,
          startX: world.x,
          startY: world.y,
          points: tool === "pen" ? [0, 0] : [0, 0, 0, 0],
          width: 0,
          height: 0,
        });
      }
    },
    [readOnly, isSpaceDown, tool, onSelect, toWorld, stageRef, onDeleteElement]
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const world = toWorld(pointer.x, pointer.y);

      // Broadcast cursor position in world coordinates for other users.
      updateMyPresence({ cursor: world });

      if (isErasing.current) {
        const hit = stage.getIntersection(pointer);
        const id = hit?.id();
        if (id) onDeleteElement(id);
        return;
      }

      if (!isDrawing.current || !draft) return;

      if (draft.type === "pen") {
        setDraft((d) =>
          d
            ? {
                ...d,
                points: [
                  ...(d.points ?? []),
                  world.x - d.startX,
                  world.y - d.startY,
                ],
              }
            : d
        );
      } else if (draft.type === "rectangle" || draft.type === "ellipse") {
        const shape = newShapeData(draft.startX, draft.startY, world.x, world.y);
        setDraft((d) => (d ? { ...d, ...shape } : d));
      } else {
        setDraft((d) =>
          d
            ? { ...d, points: [0, 0, world.x - d.startX, world.y - d.startY] }
            : d
        );
      }
    },
    [draft, toWorld, stageRef, updateMyPresence, onDeleteElement]
  );

  const handleMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (e.evt.type.startsWith("touch")) {
        e.evt.preventDefault();
      }
      isErasing.current = false;

      if (pendingText.current) {
        const { x, y } = pendingText.current;
        pendingText.current = null;
        openTextEditor({
          id: null,
          x,
          y,
          value: "",
          original: "",
          color,
          fontSize: TEXT_FONT_SIZE,
          width: TEXT_BOX_WIDTH,
        });
        return;
      }

      if (!isDrawing.current || !draft) {
        isDrawing.current = false;
        return;
      }
      isDrawing.current = false;

      if (draft.type === "pen") {
        const points = draft.points ?? [];
        if (points.length >= 4) {
          onAddElement("path", {
            x: draft.startX,
            y: draft.startY,
            color,
            strokeWidth,
            points,
          } satisfies PathElementData);
        }
      } else if (draft.type === "rectangle" || draft.type === "ellipse") {
        if ((draft.width ?? 0) > 2 && (draft.height ?? 0) > 2) {
          onAddElement(draftToElementType(draft.type), {
            x: draft.startX,
            y: draft.startY,
            color,
            strokeWidth,
            width: draft.width ?? 0,
            height: draft.height ?? 0,
            fill,
          } satisfies ShapeElementData);
        }
      } else if (draft.type === "arrow" || draft.type === "line") {
        const points = draft.points ?? [0, 0, 0, 0];
        const len = Math.hypot(points[2] - points[0], points[3] - points[1]);
        if (len > 2) {
          onAddElement(draftToElementType(draft.type), {
            x: draft.startX,
            y: draft.startY,
            color,
            strokeWidth,
            points,
          } satisfies LineElementData);
        }
      }

      setDraft(null);
      onToolChange("select");
    },
    [draft, onAddElement, color, strokeWidth, fill, onToolChange]
  );

  const selectedElement = elements.find((e) => e.id === selectedId);
  const cursorClass = isSpaceDown
    ? "cursor-grab active:cursor-grabbing"
    : tool === "select"
    ? "cursor-default"
    : tool === "eraser"
    ? "cursor-cell"
    : tool === "text"
    ? "cursor-text"
    : "cursor-crosshair";

  return (
    <div
      ref={containerRef}
      className={`paper-grid relative h-full w-full ${cursorClass}`}
      style={{
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        backgroundSize: `${22 * viewport.scale}px ${22 * viewport.scale}px`,
      }}
    >
      {size.width > 0 && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          x={viewport.x}
          y={viewport.y}
          draggable={isSpaceDown && !readOnly}
          onDragEnd={(e) =>
            setViewport((v) => ({ ...v, x: e.target.x(), y: e.target.y() }))
          }
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          <Layer listening={!readOnly}>
            {elements
              .filter((el) => el.id !== editingText?.id)
              .map((el) => (
              <ElementRenderer
                key={el.id}
                element={el}
                draggable={tool === "select" && !readOnly}
                selectable={tool === "select"}
                onSelect={onSelect}
                onDragEnd={onUpdatePosition}
                onDblClick={startEditingExisting}
              />
            ))}

            {draft && draft.type === "pen" && (
              <ElementRenderer
                element={{
                  id: "draft",
                  boardId: "",
                  type: "path",
                  data: {
                    x: draft.startX,
                    y: draft.startY,
                    color,
                    strokeWidth,
                    points: draft.points ?? [],
                  },
                  createdBy: currentUserId,
                  zIndex: 9999,
                  createdAt: "",
                  updatedAt: "",
                }}
                draggable={false}
                onSelect={() => {}}
                onDragEnd={() => {}}
              />
            )}
            {draft && (draft.type === "rectangle" || draft.type === "ellipse") && (
              <ElementRenderer
                element={{
                  id: "draft",
                  boardId: "",
                  type: draftToElementType(draft.type),
                  data: {
                    x: draft.startX,
                    y: draft.startY,
                    color,
                    strokeWidth,
                    width: draft.width ?? 0,
                    height: draft.height ?? 0,
                    fill,
                  },
                  createdBy: currentUserId,
                  zIndex: 9999,
                  createdAt: "",
                  updatedAt: "",
                }}
                draggable={false}
                onSelect={() => {}}
                onDragEnd={() => {}}
              />
            )}
            {draft && (draft.type === "arrow" || draft.type === "line") && (
              <ElementRenderer
                element={{
                  id: "draft",
                  boardId: "",
                  type: draftToElementType(draft.type),
                  data: {
                    x: draft.startX,
                    y: draft.startY,
                    color,
                    strokeWidth,
                    points: draft.points ?? [0, 0, 0, 0],
                  },
                  createdBy: currentUserId,
                  zIndex: 9999,
                  createdAt: "",
                  updatedAt: "",
                }}
                draggable={false}
                onSelect={() => {}}
                onDragEnd={() => {}}
              />
            )}

            {selectedElement && selectedElement.id !== editingText?.id && (() => {
              const b = getElementBounds(selectedElement);
              return <SelectionOutline x={b.x} y={b.y} width={b.width} height={b.height} />;
            })()}
          </Layer>
        </Stage>
      )}

      {editingText && (
        <textarea
          ref={textAreaRef}
          value={editingText.value}
          aria-label="Edit text"
          placeholder="Type…"
          rows={1}
          onChange={(e) => {
            const value = e.target.value;
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
            const next = { ...editingText, value };
            editingRef.current = next;
            setEditingText(next);
          }}
          onBlur={() => commitText()}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              commitText(true);
            } else if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commitText();
            }
            e.stopPropagation();
          }}
          className="absolute z-20 resize-none overflow-hidden rounded-sm border border-dashed border-accent/60 bg-canvas/80 p-0 outline-none placeholder:text-ink-faint"
          style={{
            left: editingText.x * viewport.scale + viewport.x,
            top: editingText.y * viewport.scale + viewport.y,
            width: editingText.width * viewport.scale,
            fontSize: editingText.fontSize * viewport.scale,
            lineHeight: TEXT_LINE_HEIGHT,
            color: editingText.color,
            fontFamily: "Inter, sans-serif",
          }}
        />
      )}

      <Cursors scale={viewport.scale} offsetX={viewport.x} offsetY={viewport.y} />

      {size.width > 0 && elements.length === 0 && !draft && (
        <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-ink-soft">
          Press P to draw
        </p>
      )}
    </div>
  );
}
