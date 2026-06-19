"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { removeListing, restoreListing } from "@/lib/admin/actions";
import { LISTING_STATUS_LABEL } from "@/lib/listings/constants";
import type { AdminListing } from "@/lib/admin/queries";

export function AdminListingRow({ listing }: { listing: AdminListing }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onAction = (action: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch {
        setError("Couldn't update listing.");
      }
    });
  };

  return (
    <li className="rounded-2xl border border-[var(--border)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusBadge status={listing.status} />
            <Link
              href={`/listings/${listing.id}`}
              className="truncate text-sm font-medium hover:underline"
            >
              {listing.title}
            </Link>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            ${listing.monthly_rent.toLocaleString()}/mo · {listing.neighborhood} ·
            owned by {listing.owner?.full_name ?? "unknown"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {listing.status !== "removed" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => onAction(() => removeListing(listing.id))}
              className="inline-flex h-9 items-center rounded-full border border-red-200 px-3 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => onAction(() => restoreListing(listing.id))}
              className="inline-flex h-9 items-center rounded-full border border-[var(--border)] px-3 text-xs font-medium hover:bg-black/5 disabled:opacity-60"
            >
              Restore to paused
            </button>
          )}
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function StatusBadge({ status }: { status: AdminListing["status"] }) {
  const styles: Record<AdminListing["status"], string> = {
    draft: "bg-zinc-100 text-zinc-700",
    published: "bg-emerald-50 text-emerald-800",
    paused: "bg-amber-50 text-amber-800",
    filled: "bg-blue-50 text-blue-800",
    expired: "bg-zinc-100 text-zinc-500",
    removed: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles[status]}`}
    >
      {LISTING_STATUS_LABEL[status]}
    </span>
  );
}
