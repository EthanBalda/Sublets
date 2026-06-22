import Link from "next/link";
import { FavoriteButton } from "@/components/listings/FavoriteButton";
import {
  HOUSING_TYPES,
  LISTING_STATUS_LABEL,
  labelFor,
} from "@/lib/listings/constants";
import type { PublicListing } from "@/lib/listings/queries";

export type ListingCardData = PublicListing & {
  primary_photo_url?: string | null;
};

type ListingCardProps = {
  listing: ListingCardData;
  isSaved: boolean;
  showStatusBadge?: boolean;
};

export function ListingCard({
  listing,
  isSaved,
  showStatusBadge = false,
}: ListingCardProps) {
  const photo = listing.primary_photo_url ?? null;
  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
      <Link
        href={`/listings/${listing.id}`}
        className="block focus:outline-none"
        aria-label={listing.title}
      >
        <Thumbnail url={photo} title={listing.title} />
        <div className="flex flex-col gap-1 px-4 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-base font-semibold">
              ${listing.monthly_rent.toLocaleString()}
              <span className="text-sm font-normal text-[var(--muted)]">/mo</span>
            </span>
            {showStatusBadge && listing.status !== "published" ? (
              <StatusBadge status={listing.status} />
            ) : null}
          </div>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">
            {listing.title}
          </h3>
          <p className="text-xs text-[var(--muted)]">
            {listing.neighborhood}
            {listing.distance_to_campus ? ` · ${listing.distance_to_campus}` : ""}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {formatDate(listing.available_start_date)} –{" "}
            {formatDate(listing.available_end_date)}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
            <Chip>{labelFor(HOUSING_TYPES, listing.housing_type)}</Chip>
            {listing.furnished ? <Chip>Furnished</Chip> : null}
            {listing.parking_available ? <Chip>Parking</Chip> : null}
          </div>
        </div>
      </Link>
      <div className="absolute right-2 top-2">
        <FavoriteButton listingId={listing.id} initialSaved={isSaved} />
      </div>
    </article>
  );
}

function Thumbnail({ url, title }: { url: string | null; title: string }) {
  if (!url || url.startsWith("placeholder://") || !/^https?:\/\//.test(url)) {
    return (
      <div className="flex h-40 items-center justify-center bg-zinc-100 text-xs text-[var(--muted)]">
        Photo placeholder
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={title}
      loading="lazy"
      className="h-40 w-full object-cover"
    />
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: PublicListing["status"] }) {
  const styles: Record<PublicListing["status"], string> = {
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

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
