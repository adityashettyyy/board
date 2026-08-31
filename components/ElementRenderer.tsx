"use client";

import { Line, Rect, Ellipse, Arrow, Text } from "react-konva";
import type Konva from "konva";
import type {
  BoardElement,
  PathElementData,
  ShapeElementData,
  LineElementData,
  TextElementData,
} from "@/lib/types";

export default function ElementRenderer({
  element,
  draggable,
  onSelect,
  onDragEnd,
  onDblClick,
}: {
  element: BoardElement;
  draggable: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onDblClick?: (id: string) => void;
}) {
  const common = {
    x: element.data.x,
    y: element.data.y,
    draggable,
    onClick: () => onSelect(element.id),
    onTap: () => onSelect(element.id),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) =>
      onDragEnd(element.id, e.target.x(), e.target.y()),
    perfectDrawEnabled: false,
  };

  switch (element.type) {
    case "path": {
      const d = element.data as PathElementData;
      return (
        <Line
          {...common}
          points={d.points}
          stroke={d.color}
          strokeWidth={d.strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.4}
          hitStrokeWidth={Math.max(16, d.strokeWidth * 2)}
        />
      );
    }
    case "rectangle": {
      const d = element.data as ShapeElementData;
      return (
        <Rect
          {...common}
          width={d.width}
          height={d.height}
          stroke={d.color}
          strokeWidth={d.strokeWidth}
          fill={d.fill ?? undefined}
          cornerRadius={2}
        />
      );
    }
    case "ellipse": {
      const d = element.data as ShapeElementData;
      return (
        <Ellipse
          {...common}
          x={element.data.x + d.width / 2}
          y={element.data.y + d.height / 2}
          radiusX={Math.abs(d.width) / 2}
          radiusY={Math.abs(d.height) / 2}
          stroke={d.color}
          strokeWidth={d.strokeWidth}
          fill={d.fill ?? undefined}
        />
      );
    }
    case "arrow": {
      const d = element.data as LineElementData;
      return (
        <Arrow
          {...common}
          points={d.points}
          stroke={d.color}
          fill={d.color}
          strokeWidth={d.strokeWidth}
          hitStrokeWidth={20}
          pointerLength={10}
          pointerWidth={10}
        />
      );
    }
    case "line": {
      const d = element.data as LineElementData;
      return (
        <Line
          {...common}
          points={d.points}
          stroke={d.color}
          strokeWidth={d.strokeWidth}
          hitStrokeWidth={20}
        />
      );
    }
    case "text": {
      const d = element.data as TextElementData;
      return (
        <Text
          {...common}
          text={d.text}
          fontSize={d.fontSize}
          fontFamily="Inter, sans-serif"
          fill={d.color}
          width={d.width}
          onDblClick={() => onDblClick?.(element.id)}
          onDblTap={() => onDblClick?.(element.id)}
        />
      );
    }
    default:
      return null;
  }
}
