import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageComposer } from "./MessageComposer";
import { ReportButton } from "@/components/reports/ReportButton";
import { requireOnboardedUser } from "@/lib/auth/session";
import {
  getConversationDetails,
  getMessagesForConversation,
  type ThreadMessage,
} from "@/lib/messages/queries";
import { LISTING_STATUS_LABEL } from "@/lib/listings/constants";

export const metadata: Metadata = { title: "Conversation" };

type ThreadPageProps = {
  params: Promise<{ conversationId: string }>;
};

export default async function ConversationThreadPage({
  params,
}: ThreadPageProps) {
  const { conversationId } = await params;
  const session = await requireOnboardedUser();

  const convo = await getConversationDetails(conversationId, session.profile.id);
  if (!convo) notFound();

  const messages = await getMessagesForConversation(convo.id);
  const otherProfile =
    convo.seeker_id === session.profile.id ? convo.lister : convo.seeker;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col px-4 py-6 sm:py-10">
      <header className="rounded-2xl border border-[var(--border)] p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          With {otherProfile?.full_name ?? "another student"}
        </p>
        {convo.listing ? (
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <Link
              href={`/listings/${convo.listing.id}`}
              className="truncate text-base font-semibold hover:underline"
            >
              {convo.listing.title}
            </Link>
            {convo.listing.status !== "published" ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                {LISTING_STATUS_LABEL[convo.listing.status]}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Listing is no longer available.
          </p>
        )}
        {convo.listing ? (
          <p className="mt-1 text-sm text-[var(--muted)]">
            ${convo.listing.monthly_rent.toLocaleString()}/mo ·{" "}
            {convo.listing.neighborhood}
          </p>
        ) : null}
        <div className="mt-3">
          <ReportButton
            target={{ kind: "conversation", conversationId: convo.id }}
            variant="link"
          />
        </div>
      </header>

      <div className="my-4 flex flex-1 flex-col gap-2">
        {messages.length === 0 ? (
          <EmptyThread />
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                isOwn={m.sender_id === session.profile.id}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4">
        <MessageComposer conversationId={convo.id} />
      </div>
    </section>
  );
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: ThreadMessage;
  isOwn: boolean;
}) {
  return (
    <li className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-6 ${
          isOwn
            ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
            : "bg-zinc-100 text-[var(--foreground)]"
        }`}
      >
        <p className="whitespace-pre-line">{message.body}</p>
        <p
          className={`mt-1 text-[10px] ${
            isOwn ? "text-white/70" : "text-[var(--muted)]"
          }`}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </li>
  );
}

function EmptyThread() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center">
      <p className="text-sm text-[var(--muted)]">
        Start the conversation by asking about availability, dates, or lease
        approval.
      </p>
    </div>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
