"use client";

import { useState, useTransition } from "react";
import { toggleChecklistItem } from "@/lib/requests/actions";

type ChecklistRowProps = {
  itemId: string;
  label: string;
  completedBySeeker: boolean;
  completedByLister: boolean;
  // Which side the current user is. Determines which checkbox is editable.
  viewerRole: "seeker" | "lister";
  // Becomes false once the request is no longer accepted (declined / completed
  // / cancelled). The action would reject anyway; we mirror it in UI.
  editable: boolean;
};

export function ChecklistRow({
  itemId,
  label,
  completedBySeeker,
  completedByLister,
  viewerRole,
  editable,
}: ChecklistRowProps) {
  const [seeker, setSeeker] = useState(completedBySeeker);
  const [lister, setLister] = useState(completedByLister);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onToggle = () => {
    if (!editable || pending) return;
    const isSeeker = viewerRole === "seeker";
    const prev = isSeeker ? seeker : lister;
    const next = !prev;
    if (isSeeker) setSeeker(next);
    else setLister(next);
    setError(null);
    startTransition(async () => {
      try {
        await toggleChecklistItem(itemId);
      } catch {
        // Roll back.
        if (isSeeker) setSeeker(prev);
        else setLister(prev);
        setError("Couldn't update — try again.");
      }
    });
  };

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2">
      <span className="flex-1 text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <SideIndicator
          label="Seeker"
          checked={seeker}
          mine={viewerRole === "seeker" && editable}
          onClick={viewerRole === "seeker" ? onToggle : undefined}
          pending={pending && viewerRole === "seeker"}
        />
        <SideIndicator
          label="Lister"
          checked={lister}
          mine={viewerRole === "lister" && editable}
          onClick={viewerRole === "lister" ? onToggle : undefined}
          pending={pending && viewerRole === "lister"}
        />
      </div>
      {error ? (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </li>
  );
}

function SideIndicator({
  label,
  checked,
  mine,
  onClick,
  pending,
}: {
  label: string;
  checked: boolean;
  mine: boolean;
  onClick?: () => void;
  pending: boolean;
}) {
  if (!mine) {
    return (
      <span
        className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] ${
          checked
            ? "bg-emerald-50 text-emerald-800"
            : "bg-zinc-100 text-zinc-500"
        }`}
        title={`${label} side: ${checked ? "done" : "pending"}`}
      >
        <Dot filled={checked} />
        {label}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={checked}
      className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium disabled:opacity-60 ${
        checked
          ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
          : "border border-[var(--border)] hover:bg-black/5"
      }`}
    >
      <Dot filled={checked} />
      {label} (you)
    </button>
  );
}

function Dot({ filled }: { filled: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        filled ? "bg-emerald-600" : "bg-zinc-300"
      }`}
    />
  );
}
