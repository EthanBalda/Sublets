import {
  acceptInterestRequest,
  cancelInterestRequest,
  completeInterestRequest,
  declineInterestRequest,
} from "@/lib/requests/actions";

type RequestActionsProps = {
  requestId: string;
  viewerRole: "seeker" | "lister";
  status: "pending" | "accepted" | "declined" | "cancelled" | "completed";
  checklistFullyDone: boolean;
};

// Render the buttons appropriate for the current viewer + request state.
// Each button is its own <form> bound to a server action — clicks throw
// to Next's error boundary on failure, which is good enough for v1.
export function RequestActions({
  requestId,
  viewerRole,
  status,
  checklistFullyDone,
}: RequestActionsProps) {
  if (status === "pending") {
    if (viewerRole === "lister") {
      return (
        <div className="flex flex-wrap gap-2">
          <ActionBtn
            action={acceptInterestRequest.bind(null, requestId)}
            label="Accept"
            primary
          />
          <ActionBtn
            action={declineInterestRequest.bind(null, requestId)}
            label="Decline"
            destructive
          />
        </div>
      );
    }
    return (
      <ActionBtn
        action={cancelInterestRequest.bind(null, requestId)}
        label="Cancel request"
        destructive
      />
    );
  }

  if (status === "accepted" && viewerRole === "lister") {
    return (
      <ActionBtn
        action={completeInterestRequest.bind(null, requestId)}
        label="Mark sublet completed"
        primary
        disabled={!checklistFullyDone}
        disabledHint="Both sides must finish every checklist item first."
      />
    );
  }

  return null;
}

function ActionBtn({
  action,
  label,
  primary = false,
  destructive = false,
  disabled = false,
  disabledHint,
}: {
  action: () => Promise<void>;
  label: string;
  primary?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const base =
    "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60";
  const style = primary
    ? "bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
    : destructive
      ? "border border-red-200 text-red-700 hover:bg-red-50"
      : "border border-[var(--border)] hover:bg-black/5";
  return (
    <form action={action}>
      <button
        type="submit"
        disabled={disabled}
        title={disabled ? disabledHint : undefined}
        className={`${base} ${style}`}
      >
        {label}
      </button>
    </form>
  );
}
