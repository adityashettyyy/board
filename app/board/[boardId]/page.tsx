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
  const { data: membership } = await supabase
    .from("board_members")
    .select("role")
    .eq("board_id", params.boardId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) redirect("/");

  const { data: board } = await supabase
    .from("boards")
    .select("*")
    .eq("id", params.boardId)
    .single();

  if (!board) redirect("/");

  const user = await currentUser();
  const name =
    user?.fullName ?? user?.username ?? user?.emailAddresses[0]?.emailAddress ?? "Anonymous";

  return (
    <BoardRoom
      boardId={params.boardId}
      boardName={board.name}
      role={membership.role as "owner" | "editor" | "viewer"}
      userName={name}
      userColor={colorForUserId(userId)}
    />
  );
}
