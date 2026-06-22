"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  SORT_OPTIONS,
  type ExploreFilters as ExploreFiltersType,
  type ExploreSort,
} from "@/lib/listings/exploreTypes";
import {
  HOUSING_TYPES,
  LEASE_STATUSES,
} from "@/lib/listings/constants";

type ExploreFiltersProps = {
  filters: ExploreFiltersType;
  sort: ExploreSort;
};

// Filter form posts via the URL so results are sharable and the server can
// render filtered output without an extra client round-trip. The filter form
// requires a click to apply; the sort dropdown applies on change.
export function ExploreFilters({ filters, sort }: ExploreFiltersProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const submit = (formData: FormData) => {
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      const v = String(value).trim();
      if (v) params.set(key, v);
    }
    // Preserve sort on filter submit so users don't lose it.
    if (sort && sort !== "newest") params.set("sort", sort);
    const qs = params.toString();
    router.push(qs ? `/explore?${qs}` : "/explore");
  };

  const onSortChange = (next: ExploreSort) => {
    const params = currentParams(filters);
    if (next === "newest") params.delete("sort");
    else params.set("sort", next);
    const qs = params.toString();
    router.push(qs ? `/explore?${qs}` : "/explore");
  };

  const activeCount = countActive(filters);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] px-4 text-sm font-medium hover:bg-black/5"
          aria-expanded={open}
        >
          Filters
          {activeCount > 0 ? (
            <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--accent-foreground)]">
              {activeCount}
            </span>
          ) : null}
        </button>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-[var(--muted)]">Sort</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as ExploreSort)}
            className="h-10 rounded-full border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--accent)]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {open ? (
        <form
          action={submit}
          className="grid grid-cols-1 gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 sm:grid-cols-2"
        >
          <NumberField
            name="min_price"
            label="Min price ($/mo)"
            defaultValue={filters.minPrice}
          />
          <NumberField
            name="max_price"
            label="Max price ($/mo)"
            defaultValue={filters.maxPrice}
          />
          <DateField
            name="available_start"
            label="Available by"
            defaultValue={filters.availableStart}
          />
          <DateField
            name="available_end"
            label="Through at least"
            defaultValue={filters.availableEnd}
          />
          <SelectField
            name="housing_type"
            label="Housing type"
            defaultValue={filters.housingType}
            options={HOUSING_TYPES}
          />
          <SelectField
            name="lease_status"
            label="Lease status"
            defaultValue={filters.leaseStatus}
            options={LEASE_STATUSES}
          />
          <TextField
            name="distance"
            label="Distance contains (e.g. walk, bike)"
            defaultValue={filters.distanceContains}
          />

          <div className="grid grid-cols-2 gap-2 sm:col-span-2">
            <Checkbox
              name="furnished"
              label="Furnished"
              defaultChecked={filters.furnished}
            />
            <Checkbox
              name="parking"
              label="Parking"
              defaultChecked={filters.parkingAvailable}
            />
            <Checkbox
              name="pets"
              label="Pets allowed"
              defaultChecked={filters.petsAllowed}
            />
            <Checkbox
              name="sharing"
              label="Room sharing required"
              defaultChecked={filters.roomSharingRequired}
            />
          </div>

          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={() => router.push("/explore")}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-medium hover:bg-black/5"
            >
              Reset
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function currentParams(filters: ExploreFiltersType): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.minPrice !== null) p.set("min_price", String(filters.minPrice));
  if (filters.maxPrice !== null) p.set("max_price", String(filters.maxPrice));
  if (filters.availableStart) p.set("available_start", filters.availableStart);
  if (filters.availableEnd) p.set("available_end", filters.availableEnd);
  if (filters.housingType) p.set("housing_type", filters.housingType);
  if (filters.leaseStatus) p.set("lease_status", filters.leaseStatus);
  if (filters.distanceContains) p.set("distance", filters.distanceContains);
  if (filters.furnished) p.set("furnished", "1");
  if (filters.parkingAvailable) p.set("parking", "1");
  if (filters.petsAllowed) p.set("pets", "1");
  if (filters.roomSharingRequired) p.set("sharing", "1");
  return p;
}

function countActive(filters: ExploreFiltersType): number {
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

// ------ tiny field primitives (kept local to avoid bloating ListingForm) ------

function NumberField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number | null;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium">{label}</span>
      <input
        type="number"
        name={name}
        min={0}
        defaultValue={defaultValue ?? ""}
        className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--accent)]"
      />
    </label>
  );
}

function TextField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium">{label}</span>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--accent)]"
      />
    </label>
  );
}

function DateField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium">{label}</span>
      <input
        type="date"
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--accent)]"
      />
    </label>
  );
}

function SelectField({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--accent)]"
      >
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/5">
      <input
        type="checkbox"
        name={name}
        value="1"
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-[var(--accent)]"
      />
      {label}
    </label>
  );
}
