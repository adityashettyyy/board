"use client";

import { RoomProvider, initialStorage } from "@/lib/liveblocks.config";
import { LiveMap } from "@liveblocks/client";
import BoardEditor from "@/components/BoardEditor";
import type { BoardRole } from "@/lib/types";

export default function BoardRoom({
  boardId,
  boardName,
  role,
  linkRole,
  userName,
  userColor,
}: {
  boardId: string;
  boardName: string;
  role: BoardRole;
  linkRole: "editor" | "viewer";
  userName: string;
  userColor: string;
}) {
  return (
    <RoomProvider
      id={boardId}
      initialPresence={{
        cursor: null,
        name: userName,
        color: userColor,
        tool: "select",
        selectedElementIds: [],
      }}
      initialStorage={initialStorage}
    >
      <BoardEditor
        boardId={boardId}
        initialName={boardName}
        role={role}
        linkRole={linkRole}
      />
    </RoomProvider>
  );
}
