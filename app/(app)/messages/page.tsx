import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <PlaceholderPage
      title="Messages"
      description="The conversation inbox ships in a later milestone. Messaging is restricted to verified students."
    />
  );
}
