import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const THUMBNAIL_BUCKET = "board-thumbnails";

async function ensureBucket(supabase: ReturnType<typeof supabaseServer>) {
  const { data: existing, error: getErr } = await supabase.storage.getBucket(THUMBNAIL_BUCKET);
  if (existing) return;

  if (getErr && !/not\s*found/i.test(getErr.message)) {
    throw new Error(`Could not check for storage bucket "${THUMBNAIL_BUCKET}": ${getErr.message}`);
  }

  const { error: createErr } = await supabase.storage.createBucket(THUMBNAIL_BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
  });
  // Ignore a race where another request created it a moment earlier.
  if (createErr && !/already exists/i.test(createErr.message)) {
    throw new Error(`Could not create storage bucket "${THUMBNAIL_BUCKET}": ${createErr.message}`);
  }
}

/** Accepts a base64 PNG data URL and stores it in the `board-thumbnails` bucket. */
export async function POST(
  req: NextRequest,
  { params }: { params: { boardId: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { dataUrl } = (await req.json()) as { dataUrl: string };
  if (!dataUrl?.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ message: "Expected a PNG data URL" }, { status: 400 });
  }
  const base64 = dataUrl.split(",")[1];
  const bytes = Buffer.from(base64, "base64");

  try {
    const supabase = supabaseServer();
    await ensureBucket(supabase);

    const path = `${params.boardId}/thumbnail.png`;

    const { error: uploadErr } = await supabase.storage
      .from(THUMBNAIL_BUCKET)
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    const { data: publicUrl } = supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(path);

    const { error: updateErr } = await supabase
      .from("boards")
      .update({ thumbnail_url: publicUrl.publicUrl })
      .eq("id", params.boardId);
    if (updateErr) throw new Error(`Failed to save thumbnail_url: ${updateErr.message}`);

    return NextResponse.json({ url: publicUrl.publicUrl });
  } catch (err) {

    console.error("[thumbnail] Failed:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Unknown thumbnail error" },
      { status: 500 }
    );
  }
}