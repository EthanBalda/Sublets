import Link from "next/link";
import type { OwnerListing } from "@/lib/listings/queries";
import {
  changeListingStatus,
  deleteListing,
} from "@/lib/listings/actions";
import { LISTING_STATUS_LABEL } from "@/lib/listings/constants";

export function MyListingsSection({ listings }: { listings: OwnerListing[] }) {
  if (listings.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center">
        <h2 className="text-base font-semibold">No listings yet</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Post a sublet to make it visible to other UCSD students.
        </p>
        <Link
          href="/listings/new"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90"
        >
          Post a sublet
        </Link>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Your listings</h2>
        <Link
          href="/listings/new"
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90"
        >
          New listing
        </Link>
      </div>
      <ul className="flex flex-col gap-3">
        {listings.map((l) => (
          <ListingRow key={l.id} listing={l} />
        ))}
      </ul>
    </section>
  );
}

function ListingRow({ listing }: { listing: OwnerListing }) {
  return (
    <li className="rounded-2xl border border-[var(--border)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusBadge status={listing.status} />
            <span className="truncate text-base font-medium">{listing.title}</span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            ${listing.monthly_rent.toLocaleString()} /mo ·{" "}
            {listing.available_start_date} → {listing.available_end_date} ·{" "}
            {listing.neighborhood}
          </p>
        </div>
        <ListingActions listing={listing} />
      </div>
    </li>
  );
}

function ListingActions({ listing }: { listing: OwnerListing }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {listing.status === "published" ||
      listing.status === "paused" ||
      listing.status === "filled" ||
      listing.status === "expired" ? (
        <LinkBtn href={`/listings/${listing.id}`}>View</LinkBtn>
      ) : null}

      <LinkBtn href={`/listings/${listing.id}/edit`}>Edit</LinkBtn>

      {listing.status === "draft" ? (
        <>
          <StatusBtn listingId={listing.id} target="published" label="Publish" primary />
          <DeleteBtn listingId={listing.id} />
        </>
      ) : null}

      {listing.status === "published" ? (
        <>
          <StatusBtn listingId={listing.id} target="paused" label="Pause" />
          <StatusBtn listingId={listing.id} target="filled" label="Mark filled" />
        </>
      ) : null}

      {listing.status === "paused" ? (
        <>
          <StatusBtn listingId={listing.id} target="published" label="Re-publish" primary />
          <StatusBtn listingId={listing.id} target="filled" label="Mark filled" />
        </>
      ) : null}

      {listing.status === "filled" || listing.status === "expired" ? (
        <StatusBtn listingId={listing.id} target="published" label="Re-publish" />
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: OwnerListing["status"] }) {
  const styles: Record<OwnerListing["status"], string> = {
    draft: "bg-zinc-100 text-zinc-700",
    published: "bg-emerald-50 text-emerald-800",
    paused: "bg-amber-50 text-amber-800",
    filled: "bg-blue-50 text-blue-800",
    expired: "bg-zinc-100 text-zinc-500",
    removed: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {LISTING_STATUS_LABEL[status]}
    </span>
  );
}

function LinkBtn({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--border)] px-3 text-xs font-medium hover:bg-black/5"
    >
      {children}
    </Link>
  );
}

function StatusBtn({
  listingId,
  target,
  label,
  primary = false,
}: {
  listingId: string;
  target: Parameters<typeof changeListingStatus>[1];
  label: string;
  primary?: boolean;
}) {
  const className = primary
    ? "inline-flex h-9 items-center justify-center rounded-full bg-[var(--accent)] px-3 text-xs font-medium text-[var(--accent-foreground)] hover:opacity-90"
    : "inline-flex h-9 items-center justify-center rounded-full border border-[var(--border)] px-3 text-xs font-medium hover:bg-black/5";
  return (
    <form action={changeListingStatus.bind(null, listingId, target)}>
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}

function DeleteBtn({ listingId }: { listingId: string }) {
  return (
    <form action={deleteListing.bind(null, listingId)}>
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-full border border-red-200 px-3 text-xs font-medium text-red-700 hover:bg-red-50"
      >
        Delete
      </button>
    </form>
  );
}
