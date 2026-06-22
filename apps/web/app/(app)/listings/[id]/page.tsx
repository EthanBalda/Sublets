import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/listings/FavoriteButton";
import { MessageButton } from "@/components/listings/MessageButton";
import { RequestButton } from "@/components/listings/RequestButton";
import { ReportButton } from "@/components/reports/ReportButton";
import { requireOnboardedUser } from "@/lib/auth/session";
import { track } from "@/lib/analytics/track";
import { isListingSaved } from "@/lib/listings/favorites";
import {
  getListerProfileCard,
  getListingPhotos,
  getPublicListing,
} from "@/lib/listings/queries";
import {
  HOUSING_TYPES,
  LEASE_STATUSES,
  LISTING_STATUS_LABEL,
  UTILITIES_INCLUDED,
  labelFor,
} from "@/lib/listings/constants";

export const metadata: Metadata = { title: "Listing" };

type ListingDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ListingDetailPage({
  params,
}: ListingDetailPageProps) {
  const { id } = await params;
  const session = await requireOnboardedUser();

  const listing = await getPublicListing(id);
  if (!listing) notFound();

  const isOwner = listing.owner_id === session.profile.id;
  const photos = await getListingPhotos(listing.id);
  const lister = await getListerProfileCard(listing.owner_id);
  const saved = await isListingSaved(session.profile.id, listing.id);

  // Best-effort view tracking. Skip self-views so owners don't inflate their
  // own counts, and skip non-published rows (draft/paused/filled views are
  // either owner-self or admin — neither is a marketplace signal).
  if (!isOwner && listing.status === "published") {
    await track("listing_viewed", {
      listing_id: listing.id,
      campus_id: listing.campus_id,
    });
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      {isOwner && listing.status !== "published" ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You&apos;re viewing your own <span className="font-medium">{LISTING_STATUS_LABEL[listing.status]}</span> listing.
          Other students can&apos;t see it until it&apos;s published.{" "}
          <Link href={`/listings/${listing.id}/edit`} className="underline">
            Edit
          </Link>
        </p>
      ) : null}

      <PhotoGrid urls={photos.map((p) => p.storage_url)} />

      <div className="mt-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {listing.title}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {listing.neighborhood}
          {listing.distance_to_campus ? ` · ${listing.distance_to_campus}` : ""}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-semibold">
            ${listing.monthly_rent.toLocaleString()}
          </span>
          <span className="text-sm text-[var(--muted)]">/ month</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-2">
        <FavoriteButton
          listingId={listing.id}
          initialSaved={saved}
          variant="pill"
        />
        {!isOwner && listing.status === "published" ? (
          <>
            <MessageButton listingId={listing.id} />
            <RequestButton listingId={listing.id} />
          </>
        ) : null}
        {!isOwner ? (
          <ReportButton
            target={{ kind: "listing", listingId: listing.id }}
          />
        ) : null}
      </div>

      <Divider />

      <FactGrid>
        <Fact label="Available">
          {formatDate(listing.available_start_date)} – {formatDate(listing.available_end_date)}
        </Fact>
        <Fact label="Housing type">
          {labelFor(HOUSING_TYPES, listing.housing_type)}
        </Fact>
        <Fact label="Utilities">
          {labelFor(UTILITIES_INCLUDED, listing.utilities_included)}
        </Fact>
        <Fact label="Bedrooms">{formatNumber(listing.bedrooms)}</Fact>
        <Fact label="Bathrooms">{formatNumber(listing.bathrooms)}</Fact>
        {listing.total_roommates !== null ? (
          <Fact label="Roommates total">{listing.total_roommates}</Fact>
        ) : null}
        {listing.security_deposit !== null ? (
          <Fact label="Security deposit">
            ${listing.security_deposit.toLocaleString()}
          </Fact>
        ) : null}
        <Fact label="Lease status">
          {labelFor(LEASE_STATUSES, listing.lease_status)}
        </Fact>
      </FactGrid>

      <Divider />

      <h2 className="text-lg font-semibold">Amenities</h2>
      <ul className="mt-3 flex flex-wrap gap-2 text-sm">
        {listing.room_sharing_required ? <Chip>Room sharing required</Chip> : null}
        {listing.furnished ? <Chip>Furnished</Chip> : null}
        {listing.parking_available ? <Chip>Parking</Chip> : null}
        {listing.laundry_available ? <Chip>Laundry</Chip> : null}
        {listing.pets_allowed ? <Chip>Pets allowed</Chip> : null}
        {listing.appliances.map((a) => (
          <Chip key={a}>{a.replaceAll("_", " ")}</Chip>
        ))}
      </ul>

      <Divider />

      <h2 className="text-lg font-semibold">About this sublet</h2>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--foreground)]">
        {listing.description}
      </p>

      <Divider />

      {lister ? (
        <ListerCard
          lister={lister}
          currentProfileId={session.profile.id}
        />
      ) : null}

      <p className="mt-8 text-xs leading-5 text-[var(--muted)]">
        Sublets helps organize the sublet process. It does not provide legal
        advice, process payments, or replace landlord approval.
      </p>
    </section>
  );
}

// ---------------------- Sub-components ----------------------

function PhotoGrid({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-zinc-50 text-sm text-[var(--muted)]">
        No photos yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {urls.map((url, i) => (
        <PhotoTile key={`${url}-${i}`} url={url} index={i} />
      ))}
    </div>
  );
}

function PhotoTile({ url, index }: { url: string; index: number }) {
  // Seed data uses `placeholder://…` URIs which won't load as images; for
  // those we render a styled placeholder instead of a broken image icon.
  if (url.startsWith("placeholder://") || !/^https?:\/\//.test(url)) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl bg-zinc-100 text-xs text-[var(--muted)]">
        Photo {index + 1} placeholder
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`Listing photo ${index + 1}`}
      loading="lazy"
      className="h-48 w-full rounded-2xl object-cover"
    />
  );
}

function FactGrid({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</dl>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">
      {children}
    </li>
  );
}

function Divider() {
  return <hr className="my-8 border-[var(--border)]" />;
}

function ListerCard({
  lister,
  currentProfileId,
}: {
  lister: NonNullable<Awaited<ReturnType<typeof getListerProfileCard>>>;
  currentProfileId: string;
}) {
  const showReport = lister.id !== currentProfileId;
  return (
    <section className="rounded-2xl border border-[var(--border)] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        Listed by
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-base font-semibold">{lister.full_name}</span>
        {lister.verification_status === "email_verified" ||
        lister.verification_status === "edu_verified" ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
            Verified .edu
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {lister.major} · Class of {lister.graduation_year}
      </p>
      {lister.bio ? (
        <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{lister.bio}</p>
      ) : null}
      {showReport ? (
        <div className="mt-3">
          <ReportButton
            target={{ kind: "user", userId: lister.id }}
            variant="link"
          />
        </div>
      ) : null}
    </section>
  );
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
