"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitOnboarding, type OnboardingState } from "./actions";

const initialState: OnboardingState = { status: "idle" };

type SelectField = {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
};

const preferenceFields: SelectField[] = [
  {
    name: "cleanliness",
    label: "Cleanliness",
    options: [
      { value: "very_tidy", label: "Very tidy" },
      { value: "tidy", label: "Tidy" },
      { value: "average", label: "Average" },
      { value: "relaxed", label: "Relaxed" },
    ],
  },
  {
    name: "noise_level",
    label: "Noise level",
    options: [
      { value: "very_quiet", label: "Very quiet" },
      { value: "quiet", label: "Quiet" },
      { value: "average", label: "Average" },
      { value: "lively", label: "Lively" },
    ],
  },
  {
    name: "smoking_preference",
    label: "Smoking",
    options: [
      { value: "no_smoking", label: "No smoking" },
      { value: "outdoors_only", label: "Outdoors only" },
      { value: "smoker_friendly", label: "Smoker-friendly" },
    ],
  },
  {
    name: "pets_preference",
    label: "Pets",
    options: [
      { value: "no_pets", label: "No pets" },
      { value: "ok_with_pets", label: "OK with pets" },
      { value: "has_pets", label: "I have pets" },
    ],
  },
  {
    name: "guests_frequency",
    label: "Guests",
    options: [
      { value: "rarely", label: "Rarely" },
      { value: "occasionally", label: "Occasionally" },
      { value: "frequently", label: "Frequently" },
    ],
  },
  {
    name: "sleep_schedule",
    label: "Sleep schedule",
    options: [
      { value: "early_riser", label: "Early riser" },
      { value: "average", label: "Average" },
      { value: "night_owl", label: "Night owl" },
    ],
  },
  {
    name: "room_sharing_preference",
    label: "Room sharing",
    options: [
      { value: "no_sharing", label: "Private room only" },
      { value: "ok_sharing", label: "OK sharing a room" },
      { value: "prefer_sharing", label: "Prefer sharing a room" },
    ],
  },
];

const heardFromOptions = [
  { value: "friend", label: "Friend" },
  { value: "instagram", label: "Instagram" },
  { value: "reddit", label: "Reddit" },
  { value: "flyer", label: "Flyer on campus" },
  { value: "other", label: "Other" },
];

export function OnboardingForm() {
  const [state, formAction] = useActionState(submitOnboarding, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="text-base font-semibold">About you</legend>

        <TextField name="full_name" label="Full name" required autoComplete="name" />

        <TextField
          name="profile_photo_url"
          label="Profile photo URL (optional)"
          placeholder="https://… (upload coming later)"
          autoComplete="url"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">School</label>
          <div className="flex h-11 items-center rounded-xl border border-[var(--border)] bg-zinc-50 px-3 text-sm text-[var(--muted)]">
            UC San Diego (UCSD beta — fixed during v1)
          </div>
          <input type="hidden" name="campus" value="UC San Diego" />
        </div>

        <TextField name="major" label="Major" required />

        <TextField
          name="graduation_year"
          label="Graduation year"
          type="number"
          inputMode="numeric"
          required
          min={1970}
          max={2099}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="bio" className="text-sm font-medium">
            Short bio
          </label>
          <textarea
            id="bio"
            name="bio"
            required
            rows={4}
            placeholder="Year, vibe, what you're looking for. Keep it short."
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-base outline-none focus:border-[var(--accent)]"
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-base font-semibold">Role on Sublets</legend>
        <RoleRadio value="seeker" label="Looking for a sublet" />
        <RoleRadio value="lister" label="Subletting my place" />
        <RoleRadio value="both" label="Both" />
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend className="col-span-full text-base font-semibold">
          Lifestyle preferences (optional)
        </legend>
        {preferenceFields.map((field) => (
          <SelectInput key={field.name} {...field} />
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-base font-semibold">
          How did you hear about Sublets?
        </legend>
        <SelectInput
          name="heard_from"
          label="(Optional)"
          options={heardFromOptions}
        />
      </fieldset>

      {state.status === "error" && state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />

      <p className="text-xs leading-5 text-[var(--muted)]">
        Sublets currently verifies student email only. Government ID
        verification is not active in this MVP.
      </p>
      <p className="text-xs leading-5 text-[var(--muted)]">
        Sublets helps organize the sublet process. It does not provide legal
        advice, process payments, or replace landlord approval.
      </p>
    </form>
  );
}

function TextField({
  name,
  label,
  type = "text",
  ...rest
}: {
  name: string;
  label: string;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "type">) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className="h-11 rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)]"
        {...rest}
      />
    </div>
  );
}

function RoleRadio({ value, label }: { value: string; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-3 hover:bg-black/5">
      <input
        type="radio"
        name="role"
        value={value}
        required
        className="h-4 w-4 accent-[var(--accent)]"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function SelectInput({ name, label, options }: SelectField) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue=""
        className="h-11 rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)]"
      >
        <option value="">No preference</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-base font-medium text-[var(--accent-foreground)] hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Finish setting up profile"}
    </button>
  );
}
