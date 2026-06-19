import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getConversationsForUser } from "@/lib/messages/queries";
import { LISTING_STATUS_LABEL } from "@/lib/listings/constants";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const session = await requireOnboardedUser();

  let conversations;
  try {
    conversations = await getConversationsForUser(session.profile.id);
  } catch {
    return (
      <Shell>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h2 className="text-base font-semibold text-red-800">
            We couldn&apos;t load your messages
          </h2>
          <p className="mt-1 text-sm text-red-700">
            Refresh the page in a moment.
          </p>
        </div>
      </Shell>
    );
  }

  if (conversations.length === 0) {
    return (
      <Shell>
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
          <h2 className="text-base font-semibold">
            You don&apos;t have any messages yet.
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Tap <span className="font-medium">Message</span> on any listing to
            start a conversation with the lister.
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

  return (
    <Shell>
      <ul className="flex flex-col gap-2">
        {conversations.map((c) => (
          <li key={c.id}>
            <Link
              href={`/messages/${c.id}`}
              className="block rounded-2xl border border-[var(--border)] p-4 hover:bg-black/5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {c.other_party?.full_name ?? "Unknown student"}
                </span>
                <span className="shrink-0 text-xs text-[var(--muted)]">
                  {formatTimestamp(c.updated_at)}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-[var(--muted)]">
                {c.listing ? c.listing.title : "Listing unavailable"}
                {c.listing && c.listing.status !== "published" ? (
                  <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                    {LISTING_STATUS_LABEL[c.listing.status]}
                  </span>
                ) : null}
              </p>
              {c.last_message ? (
                <p className="mt-1 line-clamp-1 text-xs text-[var(--muted)]">
                  {c.last_message.body}
                </p>
              ) : (
                <p className="mt-1 text-xs italic text-[var(--muted)]">
                  No messages yet
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Messages
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Chats with other UCSD students about specific listings.
      </p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
