import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Post a sublet" };

export default function NewListingPage() {
  return (
    <PlaceholderPage
      title="Post a sublet"
      description="The listing creation form ships in a later milestone. Verified students will be able to publish a sublet visible to their campus."
    />
  );
}
