import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/lib/config";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        Sublets · Help
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        Support
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Have a question or issue? Find answers to common topics below, or email
        us at{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="font-medium text-[var(--foreground)] underline hover:opacity-70"
        >
          {SUPPORT_EMAIL}
        </a>
        .
      </p>

      <div className="mt-10 space-y-8">
        <Topic title="Account access">
          <p>
            Sublets uses magic link login — we send a sign-in link to your
            university email address. Check your spam folder if the link does
            not arrive within a few minutes.
          </p>
          <p className="mt-2">
            Only students with a supported university email address can access
            the marketplace. If your institution is not yet supported, you can
            join the waitlist from the home page.
          </p>
          <p className="mt-2">
            If you are locked out of your account or need your account deleted,
            email us at{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Account Access`}
              className="underline hover:opacity-70"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </Topic>

        <Topic title="Listing issues">
          <p>
            If you created a listing and it is not appearing for other users,
            make sure it is published (not in draft). Only published listings
            are visible in the feed.
          </p>
          <p className="mt-2">
            If you believe a listing violates our Terms of Use — for example, a
            listing that appears fraudulent or discriminatory — use the report
            feature in the app or email us with the listing details.
          </p>
        </Topic>

        <Topic title="Request issues">
          <p>
            After you send a housing request, it appears as &ldquo;pending&rdquo; until
            the lister accepts or declines. You can view your sent requests in
            the Requests tab (web) or via Account → My Sent Requests (mobile).
          </p>
          <p className="mt-2">
            If you are a lister and need to accept or decline a request you
            cannot find, check the Requests tab on the dashboard.
          </p>
        </Topic>

        <Topic title="Messaging issues">
          <p>
            Messaging is only available after a housing request has been
            accepted. If you cannot see the message button, check the status of
            the request first.
          </p>
          <p className="mt-2">
            Sublets does not currently support real-time push notifications.
            Refresh the messages screen to see new messages.
          </p>
        </Topic>

        <Topic title="Reporting inappropriate content or behavior">
          <p>
            If you encounter a listing, message, or user that violates our
            Terms of Use — including fraud, harassment, discrimination, or
            impersonation — please report it using the in-app report feature or
            email us directly at{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Report`}
              className="underline hover:opacity-70"
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            with as much detail as possible.
          </p>
          <p className="mt-2">
            We review all reports and take action where appropriate, including
            removing content or suspending accounts.
          </p>
        </Topic>

        <Topic title="Privacy and data deletion">
          <p>
            To request deletion of your account and personal data, email us at{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Data Deletion Request`}
              className="underline hover:opacity-70"
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            with the subject line &ldquo;Data Deletion Request&rdquo; and the email
            address associated with your account.
          </p>
          <p className="mt-2">
            For full details on how we handle your data, see our{" "}
            <a href="/privacy" className="underline hover:opacity-70">
              Privacy Policy
            </a>
            .
          </p>
        </Topic>

        <div className="rounded-2xl border border-[var(--border)] p-6">
          <p className="text-sm font-medium">Still need help?</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Email us at{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-[var(--foreground)] underline hover:opacity-70"
            >
              {SUPPORT_EMAIL}
            </a>
            . We&apos;ll do our best to respond promptly.
          </p>
        </div>
      </div>
    </section>
  );
}

function Topic({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{children}</div>
    </div>
  );
}
