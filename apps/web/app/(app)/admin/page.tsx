import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminUser } from "@/lib/auth/session";
import {
  getAllListings,
  getAllProfiles,
  getReports,
  type AdminListing,
  type AdminProfile,
  type AdminReport,
} from "@/lib/admin/queries";
import { AdminReportCard } from "./AdminReportCard";
import { AdminListingRow } from "./AdminListingRow";
import { AdminUserRow } from "./AdminUserRow";
import {
  LISTING_STATUS_LABEL,
} from "@/lib/listings/constants";
import {
  REPORT_STATUS_LABEL,
} from "@/lib/reports/constants";
import type {
  ListingStatus,
  ReportStatus,
} from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Admin" };

type AdminPageProps = {
  searchParams: Promise<{
    reports?: string;
    listings?: string;
    users?: string;
  }>;
};

const REPORT_FILTERS: ReadonlyArray<{ value: ReportStatus | "all"; label: string }> = [
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Reviewing" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

const LISTING_FILTERS: ReadonlyArray<{ value: ListingStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "paused", label: "Paused" },
  { value: "filled", label: "Filled" },
  { value: "expired", label: "Expired" },
  { value: "removed", label: "Removed" },
];

const USER_FILTERS: ReadonlyArray<{ value: "all" | "active" | "suspended"; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await requireAdminUser();
  const sp = await searchParams;

  const reportsFilter = parseReportsFilter(sp.reports);
  const listingsFilter = parseListingsFilter(sp.listings);
  const usersFilter = parseUsersFilter(sp.users);

  let reports: AdminReport[] = [];
  let listings: AdminListing[] = [];
  let users: AdminProfile[] = [];
  const loadErrors = { reports: false, listings: false, users: false };

  await Promise.all([
    getReports(reportsFilter).then(
      (r) => (reports = r),
      () => (loadErrors.reports = true),
    ),
    getAllListings(listingsFilter).then(
      (l) => (listings = l),
      () => (loadErrors.listings = true),
    ),
    getAllProfiles(usersFilter).then(
      (u) => (users = u),
      () => (loadErrors.users = true),
    ),
  ]);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          Sublets · admin moderation
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Moderation dashboard
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Triaging area for reports, listings, and users. Lists are capped at
          50; use the filters to narrow.
        </p>
        <nav className="mt-4 flex flex-wrap gap-2 text-xs">
          <a href="#reports" className="rounded-full border border-[var(--border)] px-3 py-1 hover:bg-black/5">
            Reports
          </a>
          <a href="#listings" className="rounded-full border border-[var(--border)] px-3 py-1 hover:bg-black/5">
            Listings
          </a>
          <a href="#users" className="rounded-full border border-[var(--border)] px-3 py-1 hover:bg-black/5">
            Users
          </a>
          <Link
            href="/admin/analytics"
            className="rounded-full border border-[var(--border)] px-3 py-1 hover:bg-black/5"
          >
            Analytics →
          </Link>
        </nav>
      </header>

      <section id="reports" className="mt-10">
        <SectionHeader title="Reports" />
        <FilterPills
          basePath="/admin"
          paramKey="reports"
          current={reportsFilter}
          carry={{ listings: listingsFilter, users: usersFilter }}
          options={REPORT_FILTERS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        {loadErrors.reports ? (
          <ErrorPanel kind="reports" />
        ) : reports.length === 0 ? (
          <EmptyPanel hint={`No reports in status "${REPORT_STATUS_LABEL[reportsFilter as ReportStatus] ?? "any"}".`} />
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {reports.map((r) => (
              <li key={r.id}>
                <AdminReportCard report={r} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="listings" className="mt-12">
        <SectionHeader title="Listings" />
        <FilterPills
          basePath="/admin"
          paramKey="listings"
          current={listingsFilter}
          carry={{ reports: reportsFilter, users: usersFilter }}
          options={LISTING_FILTERS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        {loadErrors.listings ? (
          <ErrorPanel kind="listings" />
        ) : listings.length === 0 ? (
          <EmptyPanel
            hint={`No listings in status "${LISTING_STATUS_LABEL[listingsFilter as ListingStatus] ?? "any"}".`}
          />
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {listings.map((l) => (
              <AdminListingRow key={l.id} listing={l} />
            ))}
          </ul>
        )}
      </section>

      <section id="users" className="mt-12">
        <SectionHeader title="Users" />
        <FilterPills
          basePath="/admin"
          paramKey="users"
          current={usersFilter}
          carry={{ reports: reportsFilter, listings: listingsFilter }}
          options={USER_FILTERS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        {loadErrors.users ? (
          <ErrorPanel kind="users" />
        ) : users.length === 0 ? (
          <EmptyPanel hint="No users match this filter." />
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {users.map((u) => (
              <AdminUserRow
                key={u.id}
                profile={u}
                isSelf={u.id === session.profile.id}
              />
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-lg font-semibold">{title}</h2>;
}

function FilterPills<T extends string>({
  basePath,
  paramKey,
  current,
  carry,
  options,
}: {
  basePath: string;
  paramKey: string;
  current: T;
  carry: Record<string, string>;
  options: ReadonlyArray<{ value: T; label: string }>;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((opt) => {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(carry)) {
          if (v && v !== "all") params.set(k, v);
        }
        params.set(paramKey, opt.value);
        const active = current === opt.value;
        return (
          <Link
            key={opt.value}
            href={`${basePath}?${params.toString()}`}
            className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-medium ${
              active
                ? "bg-[var(--foreground)] text-[var(--background)]"
                : "border border-[var(--border)] hover:bg-black/5"
            }`}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}

function EmptyPanel({ hint }: { hint: string }) {
  return (
    <p className="mt-4 rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
      {hint}
    </p>
  );
}

function ErrorPanel({ kind }: { kind: string }) {
  return (
    <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
      Couldn&apos;t load {kind}. Refresh the page in a moment.
    </p>
  );
}

function parseReportsFilter(v: string | undefined): ReportStatus | "all" {
  if (
    v === "open" ||
    v === "reviewing" ||
    v === "resolved" ||
    v === "dismissed" ||
    v === "all"
  ) {
    return v;
  }
  return "open";
}

function parseListingsFilter(v: string | undefined): ListingStatus | "all" {
  if (
    v === "draft" ||
    v === "published" ||
    v === "paused" ||
    v === "filled" ||
    v === "expired" ||
    v === "removed" ||
    v === "all"
  ) {
    return v;
  }
  return "all";
}

function parseUsersFilter(v: string | undefined): "all" | "active" | "suspended" {
  if (v === "active" || v === "suspended" || v === "all") return v;
  return "all";
}
