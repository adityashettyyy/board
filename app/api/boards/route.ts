import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const supabase = supabaseServer();
  const { data: memberships, error: memberErr } = await supabase
    .from("board_members")
    .select("board_id")
    .eq("user_id", userId);

  if (memberErr) return NextResponse.json({ message: memberErr.message }, { status: 500 });

  const boardIds = (memberships ?? []).map((m) => m.board_id);
  if (boardIds.length === 0) return NextResponse.json({ boards: [] });

  const { data: boards, error } = await supabase
    .from("boards")
    .select("*")
    .in("id", boardIds)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ boards });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  const supabase = supabaseServer();

  const { data: board, error } = await supabase
    .from("boards")
    .insert({ name: name?.trim() || "Untitled board", owner_id: userId })
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const { error: memberErr } = await supabase
    .from("board_members")
    .insert({ board_id: board.id, user_id: userId, role: "owner" });

  if (memberErr) return NextResponse.json({ message: memberErr.message }, { status: 500 });

  return NextResponse.json({ board }, { status: 201 });
}
