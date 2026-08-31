import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: { boardId: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const membership = await requireMember(params.boardId, userId);
  if (!membership) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const supabase = supabaseServer();
  const { data: board, error } = await supabase
    .from("boards")
    .select("*")
    .eq("id", params.boardId)
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 404 });
  return NextResponse.json({ board, role: membership.role });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { boardId: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const membership = await requireMember(params.boardId, userId);
  if (!membership || membership.role === "viewer") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { name?: string; thumbnailUrl?: string };
  const supabase = supabaseServer();
  const { error } = await supabase
    .from("boards")
    .update({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.thumbnailUrl !== undefined ? { thumbnail_url: body.thumbnailUrl } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.boardId);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { boardId: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const membership = await requireMember(params.boardId, userId);
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase.from("boards").delete().eq("id", params.boardId);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
