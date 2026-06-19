"use client";

import { useTransition } from "react";
import { useState } from "react";
import { startConversationForListing } from "@/lib/messages/actions";

export function MessageButton({ listingId }: { listingId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        // The action redirects on success; the only thing we'll observe here
        // is a thrown error.
        await startConversationForListing(listingId);
      } catch (e) {
        const msg =
          e instanceof Error && !e.message.toLowerCase().includes("next_redirect")
            ? e.message
            : null;
        if (msg) setError(msg);
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-medium hover:bg-black/5 disabled:opacity-60"
      >
        {pending ? "Opening…" : "Message"}
      </button>
      {error ? (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
