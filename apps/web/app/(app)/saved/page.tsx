import type { Metadata } from "next";
import Link from "next/link";
import { ListingCard } from "@/components/listings/ListingCard";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getSavedListings } from "@/lib/listings/favorites";
import { getPrimaryPhotos } from "@/lib/listings/queries";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const session = await requireOnboardedUser();

  let listings;
  try {
    listings = await getSavedListings(session.profile.id);
  } catch {
    return (
      <Shell>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h2 className="text-base font-semibold text-red-800">
            We couldn&apos;t load your saved listings
          </h2>
          <p className="mt-1 text-sm text-red-700">
            Refresh the page in a moment.
          </p>
        </div>
      </Shell>
    );
  }

  if (listings.length === 0) {
    return (
      <Shell>
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
          <h2 className="text-base font-semibold">
            You haven&apos;t saved any listings yet.
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Tap the heart on any sublet to bookmark it for later.
          </p>
          <Link
            href="/explore"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90"
          >
            Browse Explore
          </Link>
        </div>
      </Shell>
    );
  }

  const photoMap = await getPrimaryPhotos(listings.map((l) => l.id));

  return (
    <Shell>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((l) => (
          <li key={l.id}>
            <ListingCard
              listing={{
                ...l,
                primary_photo_url: photoMap.get(l.id) ?? null,
              }}
              isSaved={true}
              showStatusBadge
            />
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Saved sublets
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Listings you&apos;ve hearted. Ones that are no longer published show a
        status badge so you know what happened.
      </p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
