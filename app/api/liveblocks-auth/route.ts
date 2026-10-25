import { auth, currentUser } from "@clerk/nextjs/server";
import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { colorForUserId } from "@/lib/colors";

export async function POST(req: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    console.error(
      "[liveblocks-auth] Missing LIVEBLOCKS_SECRET_KEY — set it in .env.local (see .env.example) and restart the dev server."
    );
    return NextResponse.json(
      { message: "Server misconfigured: LIVEBLOCKS_SECRET_KEY is not set." },
      { status: 500 }
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { room } = (await req.json()) as { room?: string };
  if (!room) {
    return NextResponse.json({ message: "Missing room" }, { status: 400 });
  }

  // `room` is the board id — confirm the user is actually a member before
  // handing out a token, so a guessed board id can't be joined. Wrapped in
  // try/catch because a misconfigured Supabase client throws here rather
  // than returning an { error } field, and an uncaught throw in this route
  // is exactly what shows up client-side as the websocket connection simply
  // timing out with no explanation.
  let membership: { role: string } | null = null;
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("board_members")
      .select("role")
      .eq("board_id", room)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    membership = data;
  } catch (err) {
    console.error("[liveblocks-auth] Supabase membership check failed:", err);
    return NextResponse.json(
      { message: "Server error while checking board membership. See server logs." },
      { status: 500 }
    );
  }

  if (!membership) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });

  const user = await currentUser();
  const name =
    user?.fullName ?? user?.username ?? user?.emailAddresses[0]?.emailAddress ?? "Anonymous";

  const session = liveblocks.prepareSession(userId, {
    userInfo: { name, color: colorForUserId(userId) },
  });

  const canWrite = membership.role !== "viewer";
  if (canWrite) {
    session.allow(room, session.FULL_ACCESS);
  } else {
    session.allow(room, session.READ_ACCESS);
  }

  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}