import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        Sublets · Legal
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Effective July 2026</p>

      <div className="mt-10 space-y-10 text-sm leading-7">
        <Section title="Overview">
          <p>
            Sublets is a student housing marketplace that helps verified college
            students find and list short-term sublets. This policy explains what
            information we collect, how we use it, and your choices about it.
          </p>
          <p className="mt-3">
            Sublets is operated as a student project. We have taken reasonable
            steps to protect your data but make no warranties beyond what is
            stated here.
          </p>
        </Section>

        <Section title="Information we collect">
          <Subsection label="Account information">
            When you sign up, we collect your email address. After you complete
            onboarding, we also collect your full name, university, major,
            graduation year, and the role you select (seeking or listing). Your
            email must be a recognized university address to access the
            marketplace.
          </Subsection>

          <Subsection label="Listing information">
            If you create a housing listing, we collect all information you
            submit: title, description, rent, housing type, dates, neighborhood,
            lease terms, utilities, and the address you provide. We do not
            display your full address publicly by default — it is shared only
            when a housing request is accepted.
          </Subsection>

          <Subsection label="Photos">
            Photos you upload for listings are stored in cloud storage and
            displayed to other authenticated users browsing the marketplace.
            Photos you upload remain associated with your listing until you
            delete them or delete your listing.
          </Subsection>

          <Subsection label="Housing requests">
            When you send a request for a listing, we record the request,
            including which listing you requested, when you sent it, and the
            status (pending, accepted, or declined).
          </Subsection>

          <Subsection label="Messages">
            After a housing request is accepted, both parties can exchange
            messages through Sublets. We store those messages in our database.
            Messages are accessible to the two participants in the conversation
            and to Sublets administrators for moderation purposes.
          </Subsection>

          <Subsection label="Checklist activity">
            After a request is accepted, both participants can complete checklist
            items to help organize the sublet process (for example, confirming
            dates and rent). We store which items have been checked and when.
          </Subsection>

          <Subsection label="Technical and service data">
            We collect data necessary to operate the service, including
            authentication tokens and session information managed by Supabase,
            error logs, and basic usage information. We do not run a separate
            analytics service at this time.
          </Subsection>
        </Section>

        <Section title="How we use your information">
          <p>We use the information we collect to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--muted)]">
            <li>Authenticate your account and maintain your session</li>
            <li>Display your profile to other users when relevant (for example, when they receive your housing request)</li>
            <li>Show your listings to other verified students browsing the marketplace</li>
            <li>Deliver messages between accepted participants</li>
            <li>Moderate the platform and respond to reports of abuse</li>
            <li>Improve the service and diagnose technical issues</li>
          </ul>
          <p className="mt-3">
            We do not use your information to send marketing email, show
            advertising, or build behavioral profiles for sale to third parties.
          </p>
        </Section>

        <Section title="Infrastructure and service providers">
          <p>
            Sublets uses <strong>Supabase</strong> for authentication, database
            storage, and file storage. Your data is stored on Supabase&apos;s
            infrastructure. Supabase&apos;s privacy policy is available at{" "}
            <a
              href="https://supabase.com/privacy"
              className="underline hover:opacity-70"
              target="_blank"
              rel="noopener noreferrer"
            >
              supabase.com/privacy
            </a>
            .
          </p>
          <p className="mt-3">
            We do not use any other third-party data processors for storing or
            processing personal information at this time.
          </p>
        </Section>

        <Section title="Data sharing">
          <p>We share your information only in these circumstances:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--muted)]">
            <li>
              <strong>With other users, as needed for the marketplace to function</strong> — for
              example, your name and university information are visible to a
              lister when you send them a housing request.
            </li>
            <li>
              <strong>With Supabase</strong> as our infrastructure provider, as
              described above.
            </li>
            <li>
              <strong>When required by law</strong> — if we receive a valid
              legal request, we may be required to disclose certain information.
            </li>
          </ul>
          <p className="mt-3">
            We do not sell your personal information to third parties.
          </p>
        </Section>

        <Section title="Data retention">
          <p>
            We retain your account information and content for as long as your
            account is active. If you delete your account or request deletion,
            we will make reasonable efforts to remove your personal data from
            our systems. Some data may remain in backups for a period of time
            after deletion.
          </p>
          <p className="mt-3">
            We have not established specific retention periods beyond the above.
            If you have questions about a specific type of data, contact us.
          </p>
        </Section>

        <Section title="Account and data deletion">
          <p>
            To request deletion of your account and associated data, email us
            at{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Data Deletion Request`}
              className="underline hover:opacity-70"
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            with the subject line &ldquo;Data Deletion Request&rdquo; and the
            email address associated with your account. We will process your
            request within a reasonable time.
          </p>
        </Section>

        <Section title="Security">
          <p>
            We use reasonable technical measures to protect the information we
            collect, including Supabase&apos;s built-in row-level security
            controls. However, no online service is completely secure. We cannot
            guarantee the absolute security of your information and make no such
            warranty.
          </p>
        </Section>

        <Section title="Children's privacy">
          <p>
            Sublets is intended for university students and is not directed at
            children under 13. We do not knowingly collect personal information
            from anyone under 13. If you believe a child has provided us with
            personal information, contact us and we will take steps to remove
            it.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this policy from time to time. If we make material
            changes, we will update the effective date above. Continued use of
            Sublets after a policy update constitutes acceptance of the revised
            policy.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy? Email us at{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="underline hover:opacity-70"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </Section>
      </div>
    </section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 text-[var(--muted)]">{children}</div>
    </div>
  );
}

function Subsection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <h3 className="font-medium text-foreground">{label}</h3>
      <p className="mt-1">{children}</p>
    </div>
  );
}
