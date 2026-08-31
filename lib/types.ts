export type Tool = "select" | "pen" | "rectangle" | "ellipse" | "arrow" | "line" | "text";

export type ElementType = "path" | "rectangle" | "ellipse" | "arrow" | "line" | "text";

export interface BaseElementData {
  x: number;
  y: number;
  color: string;
  strokeWidth: number;
  rotation?: number;
}

export interface PathElementData extends BaseElementData {
  points: number[]; // flat [x1, y1, x2, y2, ...] relative to x/y
}

export interface ShapeElementData extends BaseElementData {
  width: number;
  height: number;
  fill?: string | null;
}

export interface LineElementData extends BaseElementData {
  points: number[]; // [x1, y1, x2, y2] relative to x/y
}

export interface TextElementData extends BaseElementData {
  text: string;
  fontSize: number;
  width: number;
}

export type ElementData =
  | PathElementData
  | ShapeElementData
  | LineElementData
  | TextElementData;

export interface BoardElement {
  id: string;
  boardId: string;
  type: ElementType;
  data: ElementData;
  createdBy: string;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string | null;
}

export type BoardRole = "owner" | "editor" | "viewer";

export interface BoardMember {
  boardId: string;
  userId: string;
  role: BoardRole;
}

export interface PresenceCursor {
  x: number | null;
  y: number | null;
  name: string;
  color: string;
  tool: Tool;
}
