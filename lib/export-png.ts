import type Konva from "konva";
import type { BoardElement } from "@/lib/types";
import { getContentBounds } from "@/lib/bounds";

const EXPORT_PADDING = 40;

function renderContentToDataUrl(
  stage: Konva.Stage,
  elements: BoardElement[],
  pixelRatio: number
): string {
  const bounds = getContentBounds(elements);

  // Nothing on the board yet — fall back to whatever is currently visible
  // rather than producing a zero-size image.
  if (!bounds) {
    return stage.toDataURL({ pixelRatio, mimeType: "image/png" });
  }

  const prevScale = { x: stage.scaleX(), y: stage.scaleY() };
  const prevPos = { x: stage.x(), y: stage.y() };
  const prevSize = { width: stage.width(), height: stage.height() };

  const width = Math.ceil(bounds.width + EXPORT_PADDING * 2);
  const height = Math.ceil(bounds.height + EXPORT_PADDING * 2);

  try {
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: -bounds.x + EXPORT_PADDING, y: -bounds.y + EXPORT_PADDING });
    stage.size({ width, height });
    stage.batchDraw();

    return stage.toDataURL({ pixelRatio, mimeType: "image/png" });
  } finally {
    // Always restore the user's actual viewport, even if toDataURL throws.
    stage.scale(prevScale);
    stage.position(prevPos);
    stage.size(prevSize);
    stage.batchDraw();
  }
}

/** Exports the full board content (not just the visible viewport) as a downloaded PNG. */
export function exportStageAsPng(stage: Konva.Stage, filename: string, elements: BoardElement[]) {
  const dataUrl = renderContentToDataUrl(stage, elements, 2);
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return dataUrl;
}

/** Generates a thumbnail data URL framed to the board's content, for board-list previews. */
export function generateThumbnailDataUrl(stage: Konva.Stage, elements: BoardElement[]): string {
  return renderContentToDataUrl(stage, elements, 0.5);
}