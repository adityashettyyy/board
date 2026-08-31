"use client";

import { useEffect, useRef } from "react";
import { Rect } from "react-konva";
import Konva from "konva";

export default function SelectionOutline({
  x,
  y,
  width,
  height,
  padding = 6,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  padding?: number;
}) {
  const rectRef = useRef<Konva.Rect>(null);

  useEffect(() => {
    const node = rectRef.current;
    if (!node) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const anim = new Konva.Animation((frame) => {
      if (!frame) return;
      const offset = -((frame.time / 40) % 16);
      node.dashOffset(offset);
    }, node.getLayer());

    anim.start();
    return () => {
      anim.stop();
    };
  }, []);

  return (
    <Rect
      ref={rectRef}
      x={x - padding}
      y={y - padding}
      width={width + padding * 2}
      height={height + padding * 2}
      stroke="#1C6E8C"
      strokeWidth={1.5}
      dash={[6, 6]}
      listening={false}
      cornerRadius={2}
    />
  );
}
