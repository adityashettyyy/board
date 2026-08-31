"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import { nanoid } from "nanoid";
import ElementRenderer from "@/components/ElementRenderer";
import SelectionOutline from "@/components/SelectionOutline";
import Cursors from "@/components/Cursors";
import { useUpdateMyPresence } from "@/lib/liveblocks.config";
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

/** Tools that create a drawn element via drag (as opposed to "select" and "text"). */
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
  selectedId,
  onSelect,
  onAddElement,
  onUpdatePosition,
  onUpdateText,
  readOnly,
  stageRef,
  currentUserId,
}: {
  elements: BoardElement[];
  tool: Tool;
  onToolChange: (t: Tool) => void;
  color: string;
  strokeWidth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddElement: (type: ElementType, data: ElementData) => string;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateText: (id: string, text: string) => void;
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
  const [draft, setDraft] = useState<{
    type: DraftTool;
    startX: number;
    startY: number;
    points?: number[];
    width?: number;
    height?: number;
  } | null>(null);

  const [editingText, setEditingText] = useState<{
    id: string;
    x: number;
    y: number;
    value: string;
    fontSize: number;
  } | null>(null);
  const textEditorRef = useRef<HTMLTextAreaElement>(null);

  // Explicit focus rather than relying on `autoFocus` alone — the textarea
  // mounts in direct response to a canvas pointer event, and autoFocus can
  // silently lose the race against the browser/Konva reclaiming focus.
  useEffect(() => {
    if (editingText) {
      const el = textEditorRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    }
  }, [editingText?.id]);

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

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (readOnly) return;
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const clickedOnEmpty = e.target === stage;

      if (isSpaceDown || tool === "select") {
        if (clickedOnEmpty) onSelect(null);
        return;
      }

      // Any drawing/text tool: place the new element wherever the pointer
      // is, even if that's on top of an existing shape — only "select"
      // needs to distinguish empty canvas from a hit on existing content.
      {
        const world = toWorld(pointer.x, pointer.y);
        isDrawing.current = true;

        if (tool === "text") {
          const id = onAddElement("text", {
            x: world.x,
            y: world.y,
            color,
            strokeWidth,
            text: "",
            fontSize: 18,
            width: 240,
          } satisfies TextElementData);
          setEditingText({ id, x: world.x, y: world.y, value: "", fontSize: 18 });
          onToolChange("select");
          isDrawing.current = false;
          return;
        }

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
    [readOnly, isSpaceDown, tool, onSelect, toWorld, stageRef, onAddElement, color, strokeWidth, onToolChange]
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
    [draft, toWorld, stageRef, updateMyPresence]
  );

  const handleMouseUp = useCallback(() => {
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
          fill: null,
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
  }, [draft, onAddElement, color, strokeWidth, onToolChange]);

  function openTextEditor(id: string) {
    const el = elements.find((e) => e.id === id);
    if (!el || el.type !== "text") return;
    const d = el.data as TextElementData;
    setEditingText({ id, x: d.x, y: d.y, value: d.text, fontSize: d.fontSize });
  }

  function commitTextEditor() {
    if (!editingText) return;
    onUpdateText(editingText.id, editingText.value);
    setEditingText(null);
  }

  const selectedElement = elements.find((e) => e.id === selectedId);
  const cursorClass = isSpaceDown
    ? "cursor-grab active:cursor-grabbing"
    : tool === "select"
    ? "cursor-default"
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
            {elements.map((el) => (
              <ElementRenderer
                key={el.id}
                element={el}
                draggable={tool === "select" && !readOnly}
                onSelect={onSelect}
                onDragEnd={onUpdatePosition}
                onDblClick={openTextEditor}
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
                    fill: null,
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

            {selectedElement && (
              <SelectionOutline
                x={selectedElement.data.x}
                y={selectedElement.data.y}
                width={
                  "width" in selectedElement.data
                    ? selectedElement.data.width
                    : "points" in selectedElement.data
                    ? Math.max(
                        ...chunk2(selectedElement.data.points).map((p) => p[0])
                      ) -
                      Math.min(
                        ...chunk2(selectedElement.data.points).map((p) => p[0])
                      )
                    : 0
                }
                height={
                  "height" in selectedElement.data
                    ? selectedElement.data.height
                    : "points" in selectedElement.data
                    ? Math.max(
                        ...chunk2(selectedElement.data.points).map((p) => p[1])
                      ) -
                      Math.min(
                        ...chunk2(selectedElement.data.points).map((p) => p[1])
                      )
                    : 20
                }
              />
            )}
          </Layer>
        </Stage>
      )}

      <Cursors scale={viewport.scale} offsetX={viewport.x} offsetY={viewport.y} />

      {editingText && (
        <textarea
          ref={textEditorRef}
          value={editingText.value}
          onChange={(e) => setEditingText((s) => (s ? { ...s, value: e.target.value } : s))}
          onBlur={commitTextEditor}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape") commitTextEditor();
          }}
          placeholder="Type…"
          className="absolute z-10 min-w-[160px] min-h-[1.6em] resize-none rounded-sm border border-dashed border-accent/50 bg-white/70 p-1 text-ink caret-accent outline-none placeholder:text-ink-faint focus:border-accent focus:bg-white"
          style={{
            left: editingText.x * viewport.scale + viewport.x,
            top: editingText.y * viewport.scale + viewport.y,
            fontSize: editingText.fontSize * viewport.scale,
            fontFamily: "Inter, sans-serif",
            lineHeight: 1.25,
            width: 260 * viewport.scale,
          }}
        />
      )}

      {size.width > 0 && elements.length === 0 && !draft && (
        <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-ink-soft">
          Press P to draw, T to add text
        </p>
      )}
    </div>
  );
}

function chunk2(points: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < points.length; i += 2) out.push([points[i], points[i + 1]]);
  return out;
}