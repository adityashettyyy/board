import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Accepts a base64 PNG data URL and stores it in the `board-thumbnails` bucket. */
export async function POST(
  req: NextRequest,
  { params }: { params: { boardId: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { dataUrl } = (await req.json()) as { dataUrl: string };
  const base64 = dataUrl.split(",")[1];
  const bytes = Buffer.from(base64, "base64");

  const supabase = supabaseServer();
  const path = `${params.boardId}/thumbnail.png`;

  const { error: uploadErr } = await supabase.storage
    .from("board-thumbnails")
    .upload(path, bytes, { contentType: "image/png", upsert: true });

  if (uploadErr) return NextResponse.json({ message: uploadErr.message }, { status: 500 });

  const { data: publicUrl } = supabase.storage.from("board-thumbnails").getPublicUrl(path);

  await supabase
    .from("boards")
    .update({ thumbnail_url: publicUrl.publicUrl })
    .eq("id", params.boardId);

  return NextResponse.json({ url: publicUrl.publicUrl });
}
