import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Join the waitlist" };

export default function WaitlistPage() {
  return (
    <PlaceholderPage
      title="Join the Sublets waitlist"
      description="The waitlist form ships in Milestone 1. UCSD students will get first access; everyone else can sign up for general interest."
    />
  );
}
