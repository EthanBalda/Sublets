import type { Metadata } from "next";
import Link from "next/link";
import { ExploreFilters } from "@/components/listings/ExploreFilters";
import { ListingCard } from "@/components/listings/ListingCard";
import { requireOnboardedUser } from "@/lib/auth/session";
import {
  getExploreListings,
  parseExploreSearchParams,
} from "@/lib/listings/explore";
import { getFavoriteListingIds } from "@/lib/listings/favorites";
import { getPrimaryPhotos } from "@/lib/listings/queries";

export const metadata: Metadata = { title: "Explore" };

type ExplorePageProps = {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
};

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const session = await requireOnboardedUser();
  const sp = await searchParams;
  const { filters, sort } = parseExploreSearchParams(sp);

  let listings;
  try {
    listings = await getExploreListings(
      filters,
      sort,
      session.profile,
      session.campus.id,
    );
  } catch {
    return (
      <Shell filters={filters} sort={sort}>
        <ErrorState
          title="We couldn't load listings"
          body="Something went wrong on our end. Refresh in a moment or reset your filters."
        />
      </Shell>
    );
  }

  const photoMap = await getPrimaryPhotos(listings.map((l) => l.id));
  const savedIds = await getFavoriteListingIds(session.profile.id);

  const hasActiveFilters = countActive(filters) > 0;

  return (
    <Shell filters={filters} sort={sort}>
      {listings.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <li key={l.id}>
              <ListingCard
                listing={{
                  ...l,
                  primary_photo_url: photoMap.get(l.id) ?? null,
                }}
                isSaved={savedIds.has(l.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function Shell({
  filters,
  sort,
  children,
}: {
  filters: Parameters<typeof ExploreFilters>[0]["filters"];
  sort: Parameters<typeof ExploreFilters>[0]["sort"];
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Explore UCSD sublets
        </h1>
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Verified UCSD students only. Exact addresses stay private until you
        request access from a lister.
      </p>
      <div className="mt-6">
        <ExploreFilters filters={filters} sort={sort} />
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
        <h2 className="text-base font-semibold">No listings match these filters</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Try widening your price range or clearing some filters.
        </p>
        <Link
          href="/explore"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-medium hover:bg-black/5"
        >
          Reset filters
        </Link>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
      <h2 className="text-base font-semibold">No listings yet</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Nothing has been posted for UCSD yet — be the first.
      </p>
      <Link
        href="/listings/new"
        className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90"
      >
        Post a sublet
      </Link>
    </div>
  );
}

function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <h2 className="text-base font-semibold text-red-800">{title}</h2>
      <p className="mt-1 text-sm text-red-700">{body}</p>
    </div>
  );
}

function countActive(
  filters: Parameters<typeof ExploreFilters>[0]["filters"],
): number {
  let n = 0;
  if (filters.minPrice !== null) n++;
  if (filters.maxPrice !== null) n++;
  if (filters.availableStart) n++;
  if (filters.availableEnd) n++;
  if (filters.housingType) n++;
  if (filters.leaseStatus) n++;
  if (filters.distanceContains) n++;
  if (filters.furnished) n++;
  if (filters.parkingAvailable) n++;
  if (filters.petsAllowed) n++;
  if (filters.roomSharingRequired) n++;
  return n;
}
