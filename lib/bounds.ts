import type {
  BoardElement,
  PathElementData,
  ShapeElementData,
  LineElementData,
  TextElementData,
} from "@/lib/types";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const TEXT_LINE_HEIGHT = 1.3;

/** Rough wrapped-line count for a text element (Konva wraps by word at `width`). */
function estimateTextLines(t: TextElementData): number {
  const charsPerLine = Math.max(1, Math.floor(t.width / (t.fontSize * 0.55)));
  return t.text
    .split("\n")
    .reduce((n, line) => n + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
}

/** Axis-aligned bounds of a single element in world coordinates. */
export function getElementBounds(el: BoardElement): Bounds {
  const d = el.data;
  let x0 = d.x;
  let y0 = d.y;
  let x1 = d.x;
  let y1 = d.y;

  if ("points" in d) {
    const points = (d as PathElementData | LineElementData).points;
    x0 = Infinity;
    y0 = Infinity;
    x1 = -Infinity;
    y1 = -Infinity;
    for (let i = 0; i < points.length; i += 2) {
      x0 = Math.min(x0, d.x + points[i]);
      x1 = Math.max(x1, d.x + points[i]);
      y0 = Math.min(y0, d.y + points[i + 1]);
      y1 = Math.max(y1, d.y + points[i + 1]);
    }
    if (!isFinite(x0)) {
      x0 = x1 = d.x;
      y0 = y1 = d.y;
    }
  } else if (el.type === "text") {
    const t = d as TextElementData;
    x1 = d.x + t.width;
    y1 = d.y + t.fontSize * TEXT_LINE_HEIGHT * estimateTextLines(t);
  } else if ("width" in d && "height" in d) {
    const s = d as ShapeElementData;
    x1 = d.x + s.width;
    y1 = d.y + s.height;
  }

  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

export function getContentBounds(elements: BoardElement[]): Bounds | null {
  if (elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const b = getElementBounds(el);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return null;
  }

  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}
