"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createInterestRequest,
  type CreateRequestState,
} from "@/lib/requests/actions";

const initialState: CreateRequestState = { status: "idle" };

export function RequestButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const action = createInterestRequest.bind(null, listingId);
  const [state, formAction] = useActionState(action, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90"
      >
        Request to sublet
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex w-full flex-col gap-2 rounded-2xl border border-[var(--border)] bg-white p-3 sm:w-[28rem]"
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">
          Request to sublet (optional note)
        </span>
        <textarea
          name="message"
          rows={3}
          maxLength={1000}
          placeholder="Why this place works for you, dates you need, etc."
          className="resize-none rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>
      {state.status === "error" ? (
        <p className="text-xs text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <SubmitButton />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-medium hover:bg-black/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send request"}
    </button>
  );
}
