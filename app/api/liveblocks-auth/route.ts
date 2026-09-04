import { auth, currentUser } from "@clerk/nextjs/server";
import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { colorForUserId } from "@/lib/colors";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { room } = (await req.json()) as { room?: string };
  if (!room) {
    return NextResponse.json({ message: "Missing room" }, { status: 400 });
  }

  // `room` is the board id — confirm the user is actually a member before
  // handing out a token, so a guessed board id can't be joined.
  const supabase = supabaseServer();
  const { data: membership } = await supabase
    .from("board_members")
    .select("role")
    .eq("board_id", room)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

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
