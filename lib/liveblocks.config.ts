import { createClient, LiveMap, type Lson } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import type { Tool } from "./types";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
  throttle: 16, // ~60fps cursor updates
});

// --- Presence: ephemeral per-connection state, never persisted. ---
export type Presence = {
  cursor: { x: number; y: number } | null;
  name: string;
  color: string;
  tool: Tool;
  selectedElementIds: string[];
};

// --- Storage: the durable, synced board contents (mirrors board_elements). ---
// Stored loosely as `Lson` (Liveblocks' JSON-safe constraint) — call sites
// cast to/from the strongly-typed `BoardElement` in lib/types.ts at the
// read/write boundary (see components/BoardEditor.tsx) since BoardElement's
// concrete shape isn't declared with the index signature Lson requires.
export type Storage = {
  elements: LiveMap<string, Lson>;
};

export type UserMeta = {
  id: string;
  info: { name: string; color: string };
};

export const {
  RoomProvider,
  useRoom,
  useMyPresence,
  useUpdateMyPresence,
  useOthers,
  useOthersMapped,
  useSelf,
  useStorage,
  useMutation,
  useHistory,
  useUndo,
  useRedo,
  useCanUndo,
  useCanRedo,
  useBroadcastEvent,
  useEventListener,
} = createRoomContext<Presence, Storage, UserMeta>(client);

export function initialStorage(): Storage {
  return { elements: new LiveMap() };
}
