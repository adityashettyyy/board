import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { BoardElement } from "@/lib/types";

async function requireMember(boardId: string, userId: string) {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("board_members")
    .select("role")
    .eq("board_id", boardId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

/** Load the full element history for a board — used to hydrate Liveblocks storage on first join. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { boardId: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const membership = await requireMember(params.boardId, userId);
  if (!membership) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("board_elements")
    .select("*")
    .eq("board_id", params.boardId)
    .order("z_index", { ascending: true });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const elements: BoardElement[] = (data ?? []).map((row) => ({
    id: row.id,
    boardId: row.board_id,
    type: row.type,
    data: row.data,
    createdBy: row.created_by,
    zIndex: row.z_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return NextResponse.json({ elements });
}

/**
 * Debounced auto-save target: upserts the given elements and deletes any
 * element ids that were removed. The client sends the full current set on
 * every save (boards are small enough that a full diff-free upsert is fine).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { boardId: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const membership = await requireMember(params.boardId, userId);
  if (!membership || membership.role === "viewer") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { elements } = (await req.json()) as { elements: BoardElement[] };
  const supabase = supabaseServer();

  const rows = elements.map((el) => ({
    id: el.id,
    board_id: params.boardId,
    type: el.type,
    data: el.data,
    created_by: el.createdBy,
    z_index: el.zIndex,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    const { error: upsertErr } = await supabase.from("board_elements").upsert(rows);
    if (upsertErr) return NextResponse.json({ message: upsertErr.message }, { status: 500 });
  }

  const keepIds = elements.map((e) => e.id);
  const deleteQuery = supabase.from("board_elements").delete().eq("board_id", params.boardId);
  const { error: deleteErr } =
    keepIds.length > 0 ? await deleteQuery.not("id", "in", `(${keepIds.join(",")})`) : await deleteQuery;

  if (deleteErr) return NextResponse.json({ message: deleteErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}
