import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  return (
    <PlaceholderPage
      title="Explore UCSD sublets"
      description="The browse + search + filter experience ships in a later milestone. Listings will be limited to your verified campus."
    />
  );
}
