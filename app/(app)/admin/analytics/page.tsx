import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminUser } from "@/lib/auth/session";
import {
  getAnalyticsMetrics,
  type AnalyticsMetrics,
} from "@/lib/analytics/queries";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  await requireAdminUser();

  let metrics: AnalyticsMetrics | null = null;
  try {
    metrics = await getAnalyticsMetrics();
  } catch {
    return (
      <Shell>
        <ErrorPanel />
      </Shell>
    );
  }

  return (
    <Shell>
      <Section title="Users">
        <MetricGrid>
          <Metric label="Total users" value={metrics.totalUsers} />
          <Metric label="Onboarded" value={metrics.onboardedUsers} />
          <Metric label="Suspended" value={metrics.suspendedUsers} />
        </MetricGrid>
      </Section>

      <Section title="Listings">
        <MetricGrid>
          <Metric label="Published" value={metrics.publishedListings} />
          <Metric label="Drafts" value={metrics.draftListings} />
          <Metric label="Paused" value={metrics.pausedListings} />
          <Metric label="Filled" value={metrics.filledListings} />
          <Metric label="Removed" value={metrics.removedListings} />
          <Metric label="Expired" value={metrics.expiredListings} />
        </MetricGrid>
        <MetricGrid>
          <Metric
            label="Fill rate"
            value={
              metrics.fillRatePct === null
                ? "—"
                : `${metrics.fillRatePct.toFixed(1)}%`
            }
            hint="filled ÷ (published + paused + filled + expired + removed)"
          />
          <Metric
            label="Avg time to fill"
            value={formatDuration(metrics.avgTimeToFillMs)}
            hint="created_at → filled_at on filled listings"
          />
        </MetricGrid>
      </Section>

      <Section title="Engagement">
        <MetricGrid>
          <Metric label="Favorites" value={metrics.totalFavorites} />
          <Metric label="Conversations" value={metrics.totalConversations} />
          <Metric label="Messages sent" value={metrics.totalMessages} />
        </MetricGrid>
      </Section>

      <Section title="Interest requests">
        <MetricGrid>
          <Metric label="Total" value={metrics.totalInterestRequests} />
          <Metric label="Pending" value={metrics.pendingRequests} />
          <Metric label="Accepted" value={metrics.acceptedRequests} />
          <Metric label="Completed" value={metrics.completedRequests} />
        </MetricGrid>
      </Section>

      <Section title="Moderation">
        <MetricGrid>
          <Metric label="Total reports" value={metrics.totalReports} />
          <Metric label="Open" value={metrics.openReports} />
          <Metric
            label="Scam / harassment"
            value={metrics.scamDisputeReports}
            hint="reports with reason = scam_suspicion or harassment"
          />
        </MetricGrid>
      </Section>

      <Section title="Acquisition source">
        {metrics.heardFromCounts.length === 0 ? (
          <EmptyHint hint="No users have answered the 'how did you hear about Sublets?' question yet." />
        ) : (
          <table className="w-full overflow-hidden rounded-2xl border border-[var(--border)] text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 text-left">Heard from</th>
                <th className="px-3 py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {metrics.heardFromCounts.map((row) => (
                <tr key={row.source} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">{row.source}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          Sublets · admin analytics
        </p>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Analytics
          </h1>
          <Link
            href="/admin"
            className="rounded-full border border-[var(--border)] px-3 py-1 text-xs hover:bg-black/5"
          >
            ← Moderation
          </Link>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Operational health snapshot. Numbers update on each page load.
        </p>
      </header>
      <div className="mt-8 flex flex-col gap-10">{children}</div>
    </section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function MetricGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] p-3">
      <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-1 text-[10px] text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

function EmptyHint({ hint }: { hint: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--muted)]">
      {hint}
    </p>
  );
}

function ErrorPanel() {
  return (
    <p className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
      Couldn&apos;t load analytics. Refresh the page in a moment.
    </p>
  );
}

function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms <= 0) return "—";
  const sec = ms / 1000;
  const min = sec / 60;
  const hr = min / 60;
  const day = hr / 24;
  if (day >= 1) return `${day.toFixed(1)} d`;
  if (hr >= 1) return `${hr.toFixed(1)} h`;
  if (min >= 1) return `${min.toFixed(1)} m`;
  return `${sec.toFixed(0)} s`;
}
