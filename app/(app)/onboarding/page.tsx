import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Onboarding" };

export default function OnboardingPage() {
  return (
    <PlaceholderPage
      title="Set up your student profile"
      description="The onboarding flow ships in a later milestone. Verified students will share their year, school, and a quick bio before browsing."
    />
  );
}
