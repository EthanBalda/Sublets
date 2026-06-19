import Link from "next/link";
import {
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
} from "@/lib/requests/constants";
import type { RequestListItem } from "@/lib/requests/queries";

type RequestsSectionProps = {
  title: string;
  emptyHint: string;
  requests: RequestListItem[];
  side: "lister" | "seeker";
};

export function RequestsSection({
  title,
  emptyHint,
  requests,
  side,
}: RequestsSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {requests.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
          {emptyHint}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {requests.map((r) => (
            <RequestRow key={r.id} request={r} side={side} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RequestRow({
  request,
  side,
}: {
  request: RequestListItem;
  side: "lister" | "seeker";
}) {
  return (
    <li>
      <Link
        href={`/requests/${request.id}`}
        className="block rounded-2xl border border-[var(--border)] p-3 hover:bg-black/5"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${REQUEST_STATUS_TONE[request.status]}`}
          >
            {REQUEST_STATUS_LABEL[request.status]}
          </span>
          <span className="text-xs text-[var(--muted)]">
            {formatDate(request.created_at)}
          </span>
        </div>
        <p className="mt-1 truncate text-sm font-medium">
          {request.listing?.title ?? "Listing unavailable"}
        </p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {side === "lister" ? "From " : "To "}
          {request.other_party?.full_name ?? "another student"}
        </p>
      </Link>
    </li>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
