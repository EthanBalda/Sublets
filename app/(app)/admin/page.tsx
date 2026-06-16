import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <PlaceholderPage
      title="Admin"
      description="Moderation tools and basic analytics ship in a later milestone. Access will be restricted to Sublets staff."
    />
  );
}
