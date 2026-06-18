import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Join the waitlist" };

type WaitlistPageProps = {
  searchParams: Promise<{ reason?: string; email?: string }>;
};

export default async function WaitlistPage({ searchParams }: WaitlistPageProps) {
  const { reason, email } = await searchParams;

  const title =
    reason === "non-ucsd"
      ? "We're not at your campus yet"
      : reason === "non-edu"
        ? "Sublets is for verified students"
        : "Join the Sublets waitlist";

  const description =
    reason === "non-ucsd"
      ? `Sublets is UCSD-only during the beta. Drop your email${email ? ` (${email})` : ""} and we'll tell you when we expand to your school.`
      : reason === "non-edu"
        ? "Sublets is gated to verified .edu addresses. Use your school email and we'll keep you posted as we expand."
        : "The waitlist form ships in a later milestone. UCSD students will get first access; everyone else can sign up for general interest.";

  return <PlaceholderPage title={title} description={description} />;
}
