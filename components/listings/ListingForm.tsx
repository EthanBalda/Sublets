"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ListingFormState } from "@/lib/listings/actions";
import {
  APPLIANCE_OPTIONS,
  HOUSING_TYPES,
  LEASE_STATUSES,
  UTILITIES_INCLUDED,
} from "@/lib/listings/constants";

const initialState: ListingFormState = { status: "idle" };

export type ListingFormValues = {
  title?: string;
  housing_type?: string;
  monthly_rent?: number | null;
  security_deposit?: number | null;
  utilities_included?: string;
  available_start_date?: string | null;
  available_end_date?: string | null;
  address_private?: string | null;
  neighborhood?: string;
  distance_to_campus?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  total_roommates?: number | null;
  room_sharing_required?: boolean;
  parking_available?: boolean;
  laundry_available?: boolean;
  furnished?: boolean;
  pets_allowed?: boolean;
  appliances?: string[];
  description?: string;
  lease_status?: string;
  photo_urls?: string[];
};

type ListingFormProps = {
  action: (
    prev: ListingFormState,
    formData: FormData,
  ) => Promise<ListingFormState>;
  initialValues?: ListingFormValues;
  submitLabels?: { draft: string; publish: string };
};

export function ListingForm({
  action,
  initialValues = {},
  submitLabels = { draft: "Save as draft", publish: "Publish listing" },
}: ListingFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <Section title="Basics">
        <Text
          name="title"
          label="Title"
          defaultValue={initialValues.title ?? ""}
          error={state.fieldErrors?.title}
          placeholder="e.g. Private room in La Jolla Village 2BR"
        />
        <Select
          name="housing_type"
          label="Housing type"
          options={HOUSING_TYPES}
          defaultValue={initialValues.housing_type ?? ""}
          error={state.fieldErrors?.housing_type}
        />
        <Textarea
          name="description"
          label="Description"
          rows={5}
          defaultValue={initialValues.description ?? ""}
          error={state.fieldErrors?.description}
          placeholder="What's it like? Roommates, layout, vibe. Be specific."
        />
      </Section>

      <Section title="Rent &amp; utilities">
        <Text
          name="monthly_rent"
          label="Monthly rent (USD)"
          type="number"
          min={0}
          step={1}
          defaultValue={initialValues.monthly_rent ?? ""}
          error={state.fieldErrors?.monthly_rent}
        />
        <Text
          name="security_deposit"
          label="Security deposit (USD, optional)"
          type="number"
          min={0}
          step={1}
          defaultValue={initialValues.security_deposit ?? ""}
        />
        <Select
          name="utilities_included"
          label="Utilities"
          options={UTILITIES_INCLUDED}
          defaultValue={initialValues.utilities_included ?? ""}
          error={state.fieldErrors?.utilities_included}
        />
      </Section>

      <Section title="Dates &amp; lease">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Text
            name="available_start_date"
            label="Available from"
            type="date"
            defaultValue={initialValues.available_start_date ?? ""}
            error={state.fieldErrors?.available_start_date}
          />
          <Text
            name="available_end_date"
            label="Available to"
            type="date"
            defaultValue={initialValues.available_end_date ?? ""}
            error={state.fieldErrors?.available_end_date}
          />
        </div>
        <Select
          name="lease_status"
          label="Lease / sublet status"
          options={LEASE_STATUSES}
          defaultValue={initialValues.lease_status ?? ""}
          error={state.fieldErrors?.lease_status}
        />
      </Section>

      <Section title="Location">
        <Text
          name="neighborhood"
          label="Neighborhood (shown publicly)"
          defaultValue={initialValues.neighborhood ?? ""}
          error={state.fieldErrors?.neighborhood}
          placeholder="e.g. La Jolla Village, UTC, Mira Mesa"
        />
        <Text
          name="address_private"
          label="Exact address (private — only you can see this)"
          defaultValue={initialValues.address_private ?? ""}
          placeholder="Street address, unit #"
        />
        <Text
          name="distance_to_campus"
          label="Distance to campus (optional)"
          defaultValue={initialValues.distance_to_campus ?? ""}
          placeholder="e.g. 10 min walk, 15 min bike, 25 min bus"
        />
      </Section>

      <Section title="Unit details">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Text
            name="bedrooms"
            label="Bedrooms"
            type="number"
            min={0}
            step={0.5}
            defaultValue={initialValues.bedrooms ?? ""}
            error={state.fieldErrors?.bedrooms}
          />
          <Text
            name="bathrooms"
            label="Bathrooms"
            type="number"
            min={0}
            step={0.5}
            defaultValue={initialValues.bathrooms ?? ""}
            error={state.fieldErrors?.bathrooms}
          />
          <Text
            name="total_roommates"
            label="Total roommates (optional)"
            type="number"
            min={0}
            step={1}
            defaultValue={initialValues.total_roommates ?? ""}
          />
        </div>
        <Checkbox
          name="room_sharing_required"
          label="Room sharing required (subletter shares a bedroom)"
          defaultChecked={initialValues.room_sharing_required}
        />
      </Section>

      <Section title="Amenities">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Checkbox
            name="parking_available"
            label="Parking"
            defaultChecked={initialValues.parking_available}
          />
          <Checkbox
            name="laundry_available"
            label="Laundry"
            defaultChecked={initialValues.laundry_available}
          />
          <Checkbox
            name="furnished"
            label="Furnished"
            defaultChecked={initialValues.furnished}
          />
          <Checkbox
            name="pets_allowed"
            label="Pets allowed"
            defaultChecked={initialValues.pets_allowed}
          />
        </div>
        <div>
          <span className="text-sm font-medium">Appliances</span>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {APPLIANCE_OPTIONS.map((opt) => (
              <Checkbox
                key={opt.value}
                name="appliances"
                value={opt.value}
                label={opt.label}
                defaultChecked={initialValues.appliances?.includes(opt.value)}
              />
            ))}
          </div>
        </div>
      </Section>

      <Section title="Photos">
        <Textarea
          name="photo_urls"
          label="Photo URLs (one per line — upload coming later)"
          rows={4}
          defaultValue={(initialValues.photo_urls ?? []).join("\n")}
          placeholder={"https://example.com/photo-1.jpg\nhttps://example.com/photo-2.jpg"}
        />
      </Section>

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <SubmitButton mode="draft" label={submitLabels.draft} />
        <SubmitButton mode="publish" label={submitLabels.publish} primary />
      </div>
    </form>
  );
}

// ---------------------- Field primitives ----------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-base font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

type TextProps = {
  name: string;
  label: string;
  error?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">;

function Text({ name, label, error, ...rest }: TextProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        className={inputClass(!!error)}
        {...rest}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
    </div>
  );
}

type TextareaProps = {
  name: string;
  label: string;
  error?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name">;

function Textarea({ name, label, error, ...rest }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        className={`rounded-xl border bg-white px-3 py-2 text-base outline-none focus:border-[var(--accent)] ${
          error ? "border-red-400" : "border-[var(--border)]"
        }`}
        {...rest}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
    </div>
  );
}

function Select({
  name,
  label,
  options,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  defaultValue?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className={inputClass(!!error)}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <ErrorText>{error}</ErrorText> : null}
    </div>
  );
}

function Checkbox({
  name,
  label,
  value,
  defaultChecked,
}: {
  name: string;
  label: string;
  value?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 hover:bg-black/5">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-[var(--accent)]"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-red-600">{children}</p>;
}

function inputClass(hasError: boolean) {
  return `h-11 rounded-xl border bg-white px-3 text-base outline-none focus:border-[var(--accent)] ${
    hasError ? "border-red-400" : "border-[var(--border)]"
  }`;
}

function SubmitButton({
  mode,
  label,
  primary = false,
}: {
  mode: "draft" | "publish";
  label: string;
  primary?: boolean;
}) {
  const { pending } = useFormStatus();
  const base =
    "inline-flex h-12 flex-1 items-center justify-center rounded-full px-5 text-base font-medium disabled:opacity-60";
  const style = primary
    ? "bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
    : "border border-[var(--border)] hover:bg-black/5";
  return (
    <button
      type="submit"
      name="mode"
      value={mode}
      disabled={pending}
      className={`${base} ${style}`}
    >
      {pending ? "…" : label}
    </button>
  );
}
