"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createReport,
  type CreateReportState,
  type ReportTarget,
} from "@/lib/reports/actions";
import { REPORT_REASONS } from "@/lib/reports/constants";

const initialState: CreateReportState = { status: "idle" };

type ReportButtonProps = {
  target: ReportTarget;
  // What this button reports — used for both the trigger label and the
  // form heading. Defaults vary per kind.
  label?: string;
  variant?: "pill" | "link";
};

export function ReportButton({
  target,
  label,
  variant = "pill",
}: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const action = createReport.bind(null, target);
  const [state, formAction] = useActionState(action, initialState);

  const triggerLabel =
    label ??
    (target.kind === "listing"
      ? "Report"
      : target.kind === "conversation"
        ? "Report conversation"
        : "Report this student");

  if (state.status === "sent") {
    return (
      <p
        className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800"
        role="status"
      >
        Report sent. Thanks — we&apos;ll review it.
      </p>
    );
  }

  if (!open) {
    if (variant === "link") {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
        >
          {triggerLabel}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-medium hover:bg-black/5"
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex w-full flex-col gap-2 rounded-2xl border border-[var(--border)] bg-white p-3 sm:w-[28rem]"
    >
      <p className="text-sm font-medium">{headingFor(target)}</p>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium">Reason</span>
        <select
          name="reason"
          required
          defaultValue=""
          className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--accent)]"
        >
          <option value="" disabled>
            Pick a reason…
          </option>
          {REPORT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium">Details (optional)</span>
        <textarea
          name="details"
          rows={3}
          maxLength={2000}
          placeholder="What happened? Be specific — Sublets staff will read this."
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

function headingFor(target: ReportTarget): string {
  if (target.kind === "listing") return "Report this listing";
  if (target.kind === "conversation") return "Report this conversation";
  return "Report this student";
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
    >
      {pending ? "Sending…" : "Submit report"}
    </button>
  );
}
