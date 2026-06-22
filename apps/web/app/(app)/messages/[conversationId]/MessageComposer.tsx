"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  sendMessage,
  type SendMessageResult,
} from "@/lib/messages/actions";

const initialState: SendMessageResult = { ok: true };

export function MessageComposer({
  conversationId,
}: {
  conversationId: string;
}) {
  const action = sendMessage.bind(null, conversationId);
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset the input after a successful send. State.ok flips back to true on
  // each successful submit; we clear on every success.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-2 border-t border-[var(--border)] bg-white px-4 py-3"
    >
      {state.ok === false ? (
        <p className="text-xs text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <textarea
          name="body"
          rows={2}
          required
          maxLength={4000}
          placeholder="Type your message…"
          className="flex-1 resize-none rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <SubmitButton />
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
      className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send"}
    </button>
  );
}
