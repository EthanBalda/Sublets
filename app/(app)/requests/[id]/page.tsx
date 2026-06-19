import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChecklistRow } from "./ChecklistRow";
import { RequestActions } from "./RequestActions";
import { requireOnboardedUser } from "@/lib/auth/session";
import {
  getChecklistItems,
  getRequestDetails,
  isChecklistFullyComplete,
} from "@/lib/requests/queries";
import {
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
} from "@/lib/requests/constants";

export const metadata: Metadata = { title: "Request" };

type RequestPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RequestDetailPage({ params }: RequestPageProps) {
  const { id } = await params;
  const session = await requireOnboardedUser();

  const request = await getRequestDetails(id, session.profile.id);
  if (!request) notFound();

  const viewerRole: "seeker" | "lister" =
    request.seeker_id === session.profile.id ? "seeker" : "lister";

  const checklist =
    request.status === "accepted" || request.status === "completed"
      ? await getChecklistItems(request.id)
      : [];
  const fullyDone = isChecklistFullyComplete(checklist);

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        Sublets · interest request
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {viewerRole === "lister" ? "Request to sublet your place" : "Your request"}
        </h1>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${REQUEST_STATUS_TONE[request.status]}`}
        >
          {REQUEST_STATUS_LABEL[request.status]}
        </span>
      </div>

      <ListingSummary request={request} />

      {request.message ? (
        <section className="mt-4 rounded-2xl border border-[var(--border)] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            Message from {request.seeker?.full_name ?? "the seeker"}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6">
            {request.message}
          </p>
        </section>
      ) : null}

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PartyCard
          heading={viewerRole === "seeker" ? "You (seeker)" : "Seeker"}
          profile={request.seeker}
        />
        <PartyCard
          heading={viewerRole === "lister" ? "You (lister)" : "Lister"}
          profile={request.lister}
        />
      </section>

      <div className="mt-6">
        <RequestActions
          requestId={request.id}
          viewerRole={viewerRole}
          status={request.status}
          checklistFullyDone={fullyDone}
        />
      </div>

      {(request.status === "accepted" || request.status === "completed") &&
      checklist.length > 0 ? (
        <section className="mt-8">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Sublet checklist</h2>
            {request.status === "completed" ? (
              <span className="text-xs text-[var(--muted)]">
                Completed {formatDate(request.completed_at)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Tap your own side to mark an item done. The other party sees their
            own toggle on their device.
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {checklist.map((item) => (
              <ChecklistRow
                key={item.id}
                itemId={item.id}
                label={item.label}
                completedBySeeker={item.completed_by_seeker}
                completedByLister={item.completed_by_lister}
                viewerRole={viewerRole}
                editable={request.status === "accepted"}
              />
            ))}
          </ul>

          <p className="mt-6 rounded-lg border border-[var(--border)] bg-zinc-50 px-3 py-3 text-xs leading-5 text-[var(--muted)]">
            Sublets helps organize the sublet process. It does not provide
            legal advice, process payments, or replace landlord approval.
          </p>
        </section>
      ) : null}

      {request.status === "declined" || request.status === "cancelled" ? (
        <p className="mt-6 text-xs text-[var(--muted)]">
          This request was {request.status}. You can return to{" "}
          <Link href="/explore" className="underline">
            Explore
          </Link>{" "}
          to find other listings.
        </p>
      ) : null}
    </section>
  );
}

function ListingSummary({
  request,
}: {
  request: NonNullable<Awaited<ReturnType<typeof getRequestDetails>>>;
}) {
  const l = request.listing;
  if (!l) {
    return (
      <p className="mt-3 text-sm text-[var(--muted)]">
        This listing is no longer available.
      </p>
    );
  }
  return (
    <section className="mt-3 rounded-2xl border border-[var(--border)] p-4">
      <Link href={`/listings/${l.id}`} className="text-base font-semibold hover:underline">
        {l.title}
      </Link>
      <p className="mt-1 text-sm text-[var(--muted)]">
        ${l.monthly_rent.toLocaleString()}/mo · {l.neighborhood} ·{" "}
        {formatDateRaw(l.available_start_date)} – {formatDateRaw(l.available_end_date)}
      </p>
    </section>
  );
}

function PartyCard({
  heading,
  profile,
}: {
  heading: string;
  profile: {
    full_name: string;
    major: string;
    graduation_year: number;
    bio: string;
  } | null;
}) {
  if (!profile) {
    return (
      <div className="rounded-2xl border border-[var(--border)] p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          {heading}
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">Profile unavailable.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-[var(--border)] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        {heading}
      </p>
      <p className="mt-2 text-sm font-semibold">{profile.full_name}</p>
      <p className="text-xs text-[var(--muted)]">
        {profile.major} · Class of {profile.graduation_year}
      </p>
      {profile.bio ? (
        <p className="mt-2 line-clamp-3 text-xs text-[var(--muted)]">{profile.bio}</p>
      ) : null}
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRaw(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
