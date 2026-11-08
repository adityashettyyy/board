"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";

export default function NewBoardButton({
  createBoard,
}: {
  createBoard: () => Promise<{ error: string } | void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await createBoard();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="press shine group flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white shadow-toolbar hover:bg-accent/90 hover:shadow-lift disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 size={16} strokeWidth={2.25} className="animate-spin" />
        ) : (
          <Plus
            size={16}
            strokeWidth={2.25}
            className="transition-transform duration-300 ease-spring group-hover:rotate-90"
          />
        )}
        {isPending ? "Creating…" : "New board"}
      </button>
      {error && (
        <p role="alert" className="max-w-xs animate-pop-in text-right text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
