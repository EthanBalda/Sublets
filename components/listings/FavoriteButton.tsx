"use client";

import { useState, useTransition } from "react";
import { toggleFavorite } from "@/lib/listings/favorites";

type FavoriteButtonProps = {
  listingId: string;
  initialSaved: boolean;
  variant?: "icon" | "pill";
};

// Optimistic toggle. Flips state immediately, calls the server action, and
// rolls back if it throws. Server-side revalidatePath in the action keeps
// the rest of the page (cards, /saved) in sync on the next render.
export function FavoriteButton({
  listingId,
  initialSaved,
  variant = "icon",
}: FavoriteButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    const next = !saved;
    setSaved(next);
    setError(null);
    startTransition(async () => {
      try {
        await toggleFavorite(listingId);
      } catch {
        setSaved(!next);
        setError("Couldn't save right now.");
      }
    });
  };

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={saved}
        title={error ?? undefined}
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium disabled:opacity-60 ${
          saved
            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
            : "border-[var(--border)] hover:bg-black/5"
        }`}
      >
        <HeartIcon filled={saved} />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={saved ? "Remove from saved" : "Save listing"}
      aria-pressed={saved}
      title={error ?? undefined}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[var(--foreground)] shadow-sm backdrop-blur hover:bg-white disabled:opacity-60"
    >
      <HeartIcon filled={saved} />
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
    </svg>
  );
}
