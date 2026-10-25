"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";

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
        className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-60"
      >
        <Plus size={16} strokeWidth={2.25} />
        {isPending ? "Creating…" : "New board"}
      </button>
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
