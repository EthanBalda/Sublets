import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  return (
    <PlaceholderPage
      title="Saved sublets"
      description="Favoriting ships in a later milestone. You'll be able to save listings you want to revisit or message about."
    />
  );
}
