import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/lib/config";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        Sublets · Legal
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        Terms of Use
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Effective July 2026</p>

      <div className="mt-10 space-y-10 text-sm leading-7">
        <Section title="Acceptance">
          <p>
            By creating an account or using Sublets, you agree to these Terms of
            Use. If you do not agree, do not use the service.
          </p>
        </Section>

        <Section title="Eligibility">
          <p>
            Sublets is available to university students with a recognized
            institutional email address. At this time, access to the marketplace
            is limited to students at UC San Diego (<em>ucsd.edu</em>). Students
            at other universities may join the waitlist.
          </p>
          <p className="mt-3">
            By using Sublets, you represent that you are at least 18 years old,
            are currently enrolled at a supported university, and have the right
            to enter into these terms.
          </p>
        </Section>

        <Section title="What Sublets is">
          <p>
            Sublets is a peer-to-peer student housing marketplace. We provide a
            platform for students to list and find short-term sublets. We are
            not a landlord, property manager, real estate broker, escrow
            service, or a party to any rental agreement. We do not own, control,
            or manage any listed property.
          </p>
          <p className="mt-3">
            Sublets helps organize the sublet process. It does not provide legal
            advice, process rent or deposit payments, or replace landlord
            approval.
          </p>
        </Section>

        <Section title="Your responsibilities">
          <p>
            You are solely responsible for:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Verifying the accuracy of any listing before agreeing to sublet</li>
            <li>Confirming the identity of the other party independently</li>
            <li>Reviewing the terms of the underlying lease and ensuring subletting is permitted</li>
            <li>Obtaining landlord or property manager approval before subletting</li>
            <li>Complying with all applicable local laws, HOA rules, and lease terms</li>
            <li>Negotiating, executing, and honoring any rental or sublease agreement outside of Sublets</li>
          </ul>
          <p className="mt-3">
            Sublets does not verify the accuracy of listings, the identity of
            users beyond their institutional email address, or whether landlord
            approval has been obtained.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>You agree to use Sublets only for its intended purpose — finding or listing
          student sublets — and to comply with all applicable laws. You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Post false, misleading, or fraudulent listings or profile information</li>
            <li>Impersonate another person or misrepresent your affiliation with any institution</li>
            <li>Discriminate against other users on the basis of race, color, religion, national origin, sex, disability, familial status, or any other characteristic protected by law</li>
            <li>Harass, threaten, or abuse other users</li>
            <li>Post listings for properties you do not have the right to sublet</li>
            <li>Send spam or unsolicited commercial messages</li>
            <li>Use Sublets to facilitate any activity that is illegal or that violates anyone&apos;s rights</li>
            <li>Attempt to gain unauthorized access to any part of the service or another user&apos;s account</li>
            <li>Scrape, copy, or redistribute content from Sublets without permission</li>
          </ul>
        </Section>

        <Section title="User-generated content">
          <p>
            You retain ownership of the content you post (listings, photos, messages). By
            posting content on Sublets, you grant us a limited, non-exclusive,
            royalty-free license to display and store that content as necessary to
            operate the service.
          </p>
          <p className="mt-3">
            You are responsible for all content you post. Do not post content
            that is illegal, infringing, defamatory, or that violates anyone&apos;s
            privacy.
          </p>
        </Section>

        <Section title="Account suspension and termination">
          <p>
            We may suspend or terminate your account at our discretion if we
            believe you have violated these terms, engaged in abuse, or
            otherwise misused the platform. We will make reasonable efforts to
            notify you, but are not obligated to do so in all circumstances.
          </p>
          <p className="mt-3">
            You may stop using Sublets at any time. To request account deletion,
            contact us at{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Account Deletion Request`}
              className="underline hover:opacity-70"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="Marketplace risks">
          <p>
            Sublets does not endorse any listing or user. Meeting or transacting
            with another person based on a Sublets listing carries inherent
            risks. Take reasonable precautions: meet in public places when
            possible, verify the property independently, and do not transfer
            money without appropriate documentation.
          </p>
          <p className="mt-3">
            Sublets is not responsible for any disputes, damages, or losses that
            arise from interactions between users, including those related to
            subletting arrangements made through or facilitated by the platform.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p>
            To the fullest extent permitted by applicable law, Sublets and its
            operators are not liable for any indirect, incidental, special,
            consequential, or punitive damages arising out of or related to your
            use of the service, including but not limited to losses related to
            housing arrangements, disputes with other users, or inability to
            access the platform.
          </p>
          <p className="mt-3">
            The service is provided &ldquo;as is&rdquo; without warranty of any
            kind. We do not warrant that the service will be uninterrupted,
            error-free, or that any listing is accurate or that any user is who
            they claim to be.
          </p>
          <p className="mt-3">
            Some jurisdictions do not allow certain liability limitations, so
            the above may not apply to you in full.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms from time to time. If we make material
            changes, we will update the effective date above. Continued use of
            Sublets after a terms update constitutes acceptance of the revised
            terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms? Email us at{" "}
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
