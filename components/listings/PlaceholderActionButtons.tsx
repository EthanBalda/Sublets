// Disabled placeholders for actions that don't ship in this milestone.
// Save is real (see FavoriteButton) — Message and Report stay placeholders.

export function PlaceholderActionButtons() {
  return (
    <>
      <DisabledButton label="Message" tip="Messaging ships in a later milestone." />
      <DisabledButton label="Report" tip="Reporting ships in a later milestone." />
    </>
  );
}

function DisabledButton({ label, tip }: { label: string; tip: string }) {
  return (
    <button
      type="button"
      disabled
      title={tip}
      className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-medium text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}
