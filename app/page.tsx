import { auth } from "@clerk/nextjs/server";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import NewBoardButton from "@/components/NewBoardButton";
import BoardCard from "@/components/BoardCard";
import type { Board } from "@/lib/types";

export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    return <SignedOutHero />;
  }

  const supabase = supabaseServer();
  const { data: memberships } = await supabase
    .from("board_members")
    .select("board_id")
    .eq("user_id", userId);

  const boardIds = (memberships ?? []).map((m) => m.board_id);
  let boards: Board[] = [];
  if (boardIds.length > 0) {
    const { data } = await supabase
      .from("boards")
      .select("*")
      .in("id", boardIds)
      .order("updated_at", { ascending: false });
    boards = (data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      ownerId: b.owner_id,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      thumbnailUrl: b.thumbnail_url,
    }));
  }

  async function createBoard(): Promise<{ error: string } | void> {
    "use server";
    const { userId } = await auth();
    if (!userId) return { error: "Not signed in." };

    const supabase = supabaseServer();
    const { data: board, error: boardError } = await supabase
      .from("boards")
      .insert({ name: "Untitled board", owner_id: userId })
      .select()
      .single();

    if (boardError || !board) {
      console.error("createBoard: insert into boards failed", boardError);
      return {
        error:
          boardError?.message ??
          "Could not create the board. Check that the Supabase schema has been applied and SUPABASE_SERVICE_ROLE_KEY is set correctly.",
      };
    }

    const { error: memberError } = await supabase.from("board_members").insert({
      board_id: board.id,
      user_id: userId,
      role: "owner",
    });

    if (memberError) {
      console.error("createBoard: insert into board_members failed", memberError);
      return { error: memberError.message };
    }

    redirect(`/board/${board.id}`);
  }

  return (
    <main className="min-h-screen bg-canvas">
      <header className="flex h-14 items-center justify-between border-b border-ink-faint/50 bg-surface px-5">
        <div className="flex items-center gap-2">
          <Logo size={20} />
          <span className="text-sm font-semibold tracking-tight text-ink">Board</span>
        </div>
        <UserButton afterSignOutUrl="/" />
      </header>

      <div className="mx-auto max-w-2xl px-5 py-12">
        <div className="mb-5 flex items-baseline justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-ink">Your boards</h1>
          <NewBoardButton createBoard={createBoard} />
        </div>

        {boards.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink-faint px-4 py-14 text-center">
            <p className="text-sm text-ink-soft">
              No boards yet. Create one, then press{" "}
              <kbd className="rounded border border-ink-faint/70 bg-canvas px-1 py-0.5 font-mono text-[11px]">
                P
              </kbd>{" "}
              to draw or{" "}
              <kbd className="rounded border border-ink-faint/70 bg-canvas px-1 py-0.5 font-mono text-[11px]">
                T
              </kbd>{" "}
              to add text.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-ink-faint/30 border-t border-ink-faint/30">
            {boards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function SignedOutHero() {
  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      <header className="flex h-14 items-center px-5">
        <div className="flex items-center gap-2">
          <Logo size={20} />
          <span className="text-sm font-semibold tracking-tight text-ink">Board</span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-10 px-6 py-10 md:flex-row md:gap-16 md:py-0">
        <div className="max-w-sm text-center md:text-left">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            A shared surface for thinking together.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Draw, sketch, and write with your team in real time — no exports,
            no waiting for a sync, just an open board.
          </p>
          <div className="mt-6">
            <SignInButton mode="modal">
              <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90">
                Sign in to start a board
              </button>
            </SignInButton>
          </div>
        </div>

        <HeroSketch />
      </div>
    </main>
  );
}

/** A small, hand-built preview of the actual product — not stock hero art. */
function HeroSketch() {
  return (
    <svg
      viewBox="0 0 360 260"
      className="w-full max-w-md"
      role="img"
      aria-label="Preview of a board with drawn shapes and two collaborators' cursors"
    >
      <rect x="0.5" y="0.5" width="359" height="259" rx="10" fill="#F2F1EC" stroke="#E3E1D7" />
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 11 }).map((_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={20 + col * 32}
            cy={20 + row * 32}
            r={1}
            fill="#DEDCD2"
          />
        ))
      )}

      <rect x="36" y="146" width="70" height="52" rx="3" fill="none" stroke="#1C6E8C" strokeWidth="2" />
      <path
        d="M140 190 Q 150 130 175 160 T 220 140"
        fill="none"
        stroke="#1C1B19"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <g transform="translate(240,150)">
        <rect width="86" height="44" rx="3" fill="#FFFFFF" stroke="#CC9A2E" strokeWidth="1.5" />
        <rect x="10" y="12" width="50" height="4" rx="2" fill="#B8B6AE" />
        <rect x="10" y="22" width="34" height="4" rx="2" fill="#B8B6AE" />
      </g>

      <g transform="translate(210,58)">
        <path d="M2 1.5 15 8.5 9 9.5 6 16 2 1.5Z" fill="#E8735C" stroke="white" strokeWidth="1" />
        <rect x="16" y="6" width="42" height="16" rx="8" fill="#E8735C" />
        <text x="24" y="17" fontSize="9" fill="white" fontFamily="Inter, sans-serif" fontWeight="600">
          Maya
        </text>
      </g>
      <g transform="translate(90,90)">
        <path d="M2 1.5 15 8.5 9 9.5 6 16 2 1.5Z" fill="#8B5FBF" stroke="white" strokeWidth="1" />
        <rect x="16" y="6" width="38" height="16" rx="8" fill="#8B5FBF" />
        <text x="24" y="17" fontSize="9" fill="white" fontFamily="Inter, sans-serif" fontWeight="600">
          Theo
        </text>
      </g>
    </svg>
  );
}
