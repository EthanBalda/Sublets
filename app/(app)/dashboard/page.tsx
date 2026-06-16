import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <PlaceholderPage
      title="Your dashboard"
      description="Your account home ships in a later milestone. You'll see your listings, requests, and verification status here."
    />
  );
}
