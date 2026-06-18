import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { requireAdminUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdminUser();
  return (
    <PlaceholderPage
      title="Admin"
      description="Moderation tools and basic analytics ship in a later milestone. Access is restricted to Sublets staff."
    />
  );
}
