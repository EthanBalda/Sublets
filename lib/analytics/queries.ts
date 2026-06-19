import { createSupabaseServerClient } from "@/lib/supabase/server";

// All metrics for the admin analytics dashboard. Most are PostgREST `count`
// queries running in parallel; the two derived metrics (fill rate, average
// time-to-fill) plus the heard_from grouping are computed in JS from small
// payloads — fine at MVP volume, swap in a Postgres view if numbers grow.

export type HeardFromCount = { source: string; count: number };

export type AnalyticsMetrics = {
  // Users
  totalUsers: number;
  onboardedUsers: number;
  suspendedUsers: number;

  // Listings
  draftListings: number;
  publishedListings: number;
  pausedListings: number;
  filledListings: number;
  expiredListings: number;
  removedListings: number;

  // Listing fill rate = filled / (published + paused + filled + expired + removed)
  fillRatePct: number | null;

  // Average time from listings.created_at to listings.filled_at (ms)
  avgTimeToFillMs: number | null;

  // Engagement
  totalFavorites: number;
  totalConversations: number;
  totalMessages: number;

  // Interest requests
  totalInterestRequests: number;
  pendingRequests: number;
  acceptedRequests: number;
  completedRequests: number;

  // Moderation
  totalReports: number;
  openReports: number;
  scamDisputeReports: number;

  // Acquisition
  heardFromCounts: HeardFromCount[];
};

// Supabase's filter builder is *thenable* but not a strict Promise — the
// generic parameter `T` lets each caller pass its full chain without a type
// fight, and we cast to the shape we actually consume.
async function count<T>(
  builder: (
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  ) => T,
): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const res = (await builder(supabase)) as { count: number | null };
  return res.count ?? 0;
}

export async function getAnalyticsMetrics(): Promise<AnalyticsMetrics> {
  const supabase = await createSupabaseServerClient();

  // Run every COUNT in parallel. Each query streams nothing back beyond the
  // count (head: true), so this is cheap.
  const counts = await Promise.all([
    count((s) =>
      s.from("profiles").select("*", { count: "exact", head: true }),
    ),
    count((s) =>
      s
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_onboarded", true),
    ),
    count((s) =>
      s
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_suspended", true),
    ),
    count((s) =>
      s
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("status", "draft"),
    ),
    count((s) =>
      s
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),
    ),
    count((s) =>
      s
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("status", "paused"),
    ),
    count((s) =>
      s
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("status", "filled"),
    ),
    count((s) =>
      s
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("status", "expired"),
    ),
    count((s) =>
      s
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("status", "removed"),
    ),
    count((s) =>
      s.from("favorites").select("*", { count: "exact", head: true }),
    ),
    count((s) =>
      s.from("conversations").select("*", { count: "exact", head: true }),
    ),
    count((s) =>
      s.from("messages").select("*", { count: "exact", head: true }),
    ),
    count((s) =>
      s.from("interest_requests").select("*", { count: "exact", head: true }),
    ),
    count((s) =>
      s
        .from("interest_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
    ),
    count((s) =>
      s
        .from("interest_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted"),
    ),
    count((s) =>
      s
        .from("interest_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
    ),
    count((s) => s.from("reports").select("*", { count: "exact", head: true })),
    count((s) =>
      s
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "open"),
    ),
    count((s) =>
      s
        .from("reports")
        .select("*", { count: "exact", head: true })
        .in("reason", ["scam_suspicion", "harassment"]),
    ),
  ]);

  const [
    totalUsers,
    onboardedUsers,
    suspendedUsers,
    draftListings,
    publishedListings,
    pausedListings,
    filledListings,
    expiredListings,
    removedListings,
    totalFavorites,
    totalConversations,
    totalMessages,
    totalInterestRequests,
    pendingRequests,
    acceptedRequests,
    completedRequests,
    totalReports,
    openReports,
    scamDisputeReports,
  ] = counts;

  // Fill rate denominator: every listing that's no longer a draft.
  const fillRateDenominator =
    publishedListings +
    pausedListings +
    filledListings +
    expiredListings +
    removedListings;
  const fillRatePct =
    fillRateDenominator > 0
      ? (filledListings / fillRateDenominator) * 100
      : null;

  // Average time-to-fill: pull only the two timestamps for filled rows.
  let avgTimeToFillMs: number | null = null;
  if (filledListings > 0) {
    const { data: filled } = await supabase
      .from("listings")
      .select("created_at, filled_at")
      .eq("status", "filled")
      .not("filled_at", "is", null);
    if (filled && filled.length > 0) {
      const total = filled.reduce((sum, row) => {
        if (!row.filled_at) return sum;
        const ms =
          new Date(row.filled_at).getTime() - new Date(row.created_at).getTime();
        return sum + ms;
      }, 0);
      avgTimeToFillMs = Math.round(total / filled.length);
    }
  }

  // heard_from grouping. Profile counts in MVP are small; do it in JS to keep
  // the dashboard query path lint-clean without a Postgres view.
  const { data: heardRows } = await supabase
    .from("profiles")
    .select("heard_from");
  const heardFromMap = new Map<string, number>();
  for (const row of heardRows ?? []) {
    const key = row.heard_from ?? "unspecified";
    heardFromMap.set(key, (heardFromMap.get(key) ?? 0) + 1);
  }
  const heardFromCounts: HeardFromCount[] = Array.from(heardFromMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalUsers,
    onboardedUsers,
    suspendedUsers,
    draftListings,
    publishedListings,
    pausedListings,
    filledListings,
    expiredListings,
    removedListings,
    fillRatePct,
    avgTimeToFillMs,
    totalFavorites,
    totalConversations,
    totalMessages,
    totalInterestRequests,
    pendingRequests,
    acceptedRequests,
    completedRequests,
    totalReports,
    openReports,
    scamDisputeReports,
    heardFromCounts,
  };
}
