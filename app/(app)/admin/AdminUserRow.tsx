"use client";

import { useState, useTransition } from "react";
import {
  setIdVerificationStatus,
  setUserSuspension,
} from "@/lib/admin/actions";
import { ID_VERIFICATION_OPTIONS } from "@/lib/admin/constants";
import type { AdminProfile } from "@/lib/admin/queries";

export function AdminUserRow({
  profile,
  isSelf,
}: {
  profile: AdminProfile;
  isSelf: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [suspended, setSuspended] = useState(profile.is_suspended);
  const [idStatus, setIdStatus] = useState(profile.id_verification_status);

  const toggleSuspension = () => {
    const next = !suspended;
    setSuspended(next);
    setError(null);
    startTransition(async () => {
      try {
        await setUserSuspension(profile.id, next);
      } catch (e) {
        setSuspended(!next);
        setError(
          e instanceof Error ? e.message : "Couldn't update suspension.",
        );
      }
    });
  };

  const onIdStatusChange = (next: string) => {
    const prev = idStatus;
    setIdStatus(next);
    setError(null);
    startTransition(async () => {
      try {
        await setIdVerificationStatus(profile.id, next);
      } catch {
        setIdStatus(prev);
        setError("Couldn't update verification status.");
      }
    });
  };

  return (
    <li className="rounded-2xl border border-[var(--border)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">
              {profile.full_name}
            </span>
            {profile.is_admin ? (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-800">
                Admin
              </span>
            ) : null}
            {suspended ? (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-red-700">
                Suspended
              </span>
            ) : null}
            {isSelf ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                You
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {profile.major} · Class of {profile.graduation_year} · {profile.role}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">
            Email verification: {profile.verification_status}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <label className="flex items-center gap-2 text-xs">
            <span className="text-[var(--muted)]">ID status</span>
            <select
              value={idStatus}
              disabled={pending}
              onChange={(e) => onIdStatusChange(e.target.value)}
              className="h-9 rounded-full border border-[var(--border)] bg-white px-2 text-xs outline-none focus:border-[var(--accent)]"
            >
              {ID_VERIFICATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={pending || isSelf}
            onClick={toggleSuspension}
            title={isSelf ? "You can't suspend your own account." : undefined}
            className={`inline-flex h-9 items-center rounded-full px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
              suspended
                ? "border border-[var(--border)] hover:bg-black/5"
                : "border border-red-200 text-red-700 hover:bg-red-50"
            }`}
          >
            {suspended ? "Unsuspend" : "Suspend"}
          </button>
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}
