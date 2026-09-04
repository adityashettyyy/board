import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { colorForUserId } from "@/lib/colors";
import BoardRoom from "@/components/BoardRoom";

export default async function BoardPage({
  params,
}: {
  params: { boardId: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const supabase = supabaseServer();

  // The board must actually exist before we let anyone join it.
  const { data: board } = await supabase
    .from("boards")
    .select("*")
    .eq("id", params.boardId)
    .maybeSingle();

  if (!board) redirect("/");

  const { data: existingMembership } = await supabase
    .from("board_members")
    .select("role")
    .eq("board_id", params.boardId)
    .eq("user_id", userId)
    .maybeSingle();

  let role = existingMembership?.role as "owner" | "editor" | "viewer" | undefined;

  // "Copy link" only means something if opening that link actually grants
  // access. A signed-in user hitting a valid board id for the first time
  // joins automatically as an editor — the standard "anyone with the link
  // can edit" model this app's sharing flow is built around.
  if (!role) {
    const { data: newMembership, error } = await supabase
      .from("board_members")
      .insert({ board_id: params.boardId, user_id: userId, role: "editor" })
      .select("role")
      .single();

    if (error || !newMembership) redirect("/");
    role = newMembership.role as "editor";
  }

  const user = await currentUser();
  const name =
    user?.fullName ?? user?.username ?? user?.emailAddresses[0]?.emailAddress ?? "Anonymous";

  return (
    <BoardRoom
      boardId={params.boardId}
      boardName={board.name}
      role={role}
      userName={name}
      userColor={colorForUserId(userId)}
    />
  );
}