"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  updateReportNotes,
  updateReportStatus,
} from "@/lib/admin/actions";
import {
  REPORT_STATUS_LABEL,
  REPORT_STATUS_TONE,
  labelForReason,
} from "@/lib/reports/constants";
import type { ReportStatus } from "@/lib/supabase/types";
import type { AdminReport } from "@/lib/admin/queries";

export function AdminReportCard({ report }: { report: AdminReport }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onStatusChange = (next: ReportStatus) => {
    setError(null);
    startTransition(async () => {
      try {
        await updateReportStatus(report.id, next);
      } catch {
        setError("Couldn't update status.");
      }
    });
  };

  return (
    <article className="rounded-2xl border border-[var(--border)] p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${REPORT_STATUS_TONE[report.status]}`}
          >
            {REPORT_STATUS_LABEL[report.status]}
          </span>
          <h3 className="text-sm font-semibold">{labelForReason(report.reason)}</h3>
        </div>
        <span className="text-xs text-[var(--muted)]">
          {formatDate(report.created_at)}
        </span>
      </header>

      {report.details ? (
        <p className="mt-2 whitespace-pre-line text-sm leading-6">
          {report.details}
        </p>
      ) : (
        <p className="mt-2 text-xs italic text-[var(--muted)]">
          No additional details provided.
        </p>
      )}

      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <Row label="Reporter">
          {report.reporter?.full_name ?? "Unknown"}
        </Row>
        <Row label="Reported user">
          {report.reported_user?.full_name ?? "—"}
        </Row>
        <Row label="Listing">
          {report.listing ? (
            <Link
              href={`/listings/${report.listing.id}`}
              className="underline-offset-2 hover:underline"
            >
              {report.listing.title}
            </Link>
          ) : (
            "—"
          )}
        </Row>
        <Row label="Conversation">
          {report.conversation
            ? `${report.conversation.seeker?.full_name ?? "?"} ↔ ${report.conversation.lister?.full_name ?? "?"}${
                report.conversation.listing
                  ? ` · ${report.conversation.listing.title}`
                  : ""
              }`
            : "—"}
        </Row>
      </dl>

      <form
        action={updateReportNotes.bind(null, report.id)}
        className="mt-4 flex flex-col gap-2"
      >
        <label className="text-xs font-medium">Admin notes</label>
        <textarea
          name="notes"
          defaultValue={report.admin_notes ?? ""}
          rows={2}
          placeholder="What did you find? Any action taken?"
          className="resize-none rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          className="self-start rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-black/5"
        >
          Save notes
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBtn
          label="Mark reviewing"
          targetStatus="reviewing"
          current={report.status}
          onClick={onStatusChange}
          pending={pending}
        />
        <StatusBtn
          label="Resolve"
          targetStatus="resolved"
          current={report.status}
          onClick={onStatusChange}
          pending={pending}
          tone="primary"
        />
        <StatusBtn
          label="Dismiss"
          targetStatus="dismissed"
          current={report.status}
          onClick={onStatusChange}
          pending={pending}
          tone="muted"
        />
        {error ? (
          <span className="text-xs text-red-600" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-2">
      <dt className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

function StatusBtn({
  label,
  targetStatus,
  current,
  onClick,
  pending,
  tone = "default",
}: {
  label: string;
  targetStatus: ReportStatus;
  current: ReportStatus;
  onClick: (next: ReportStatus) => void;
  pending: boolean;
  tone?: "default" | "primary" | "muted";
}) {
  const disabled = pending || current === targetStatus;
  const base =
    "inline-flex h-9 items-center rounded-full px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50";
  const style =
    tone === "primary"
      ? "bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
      : tone === "muted"
        ? "border border-[var(--border)] text-[var(--muted)] hover:bg-black/5"
        : "border border-[var(--border)] hover:bg-black/5";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(targetStatus)}
      className={`${base} ${style}`}
      title={current === targetStatus ? "Already this status" : undefined}
    >
      {label}
    </button>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
