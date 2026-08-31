import type Konva from "konva";

/** Exports the current viewport of a Konva stage as a downloaded PNG. */
export function exportStageAsPng(stage: Konva.Stage, filename: string) {
  const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return dataUrl;
}
