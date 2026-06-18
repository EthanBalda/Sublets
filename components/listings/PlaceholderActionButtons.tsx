// Buttons rendered on the listing detail page for actions that don't ship
// in this milestone. Each button is intentionally disabled with a tooltip
// so the affordance is visible without misleading the user.

export function PlaceholderActionButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <DisabledButton label="Save" tip="Favorites ship in a later milestone." />
      <DisabledButton label="Message" tip="Messaging ships in a later milestone." />
      <DisabledButton label="Report" tip="Reporting ships in a later milestone." />
    </div>
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
