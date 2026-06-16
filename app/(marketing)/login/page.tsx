import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <PlaceholderPage
      title="Log in with your .edu email"
      description="Authentication isn't wired up yet. In v1, only verified .edu addresses from supported campuses will be able to log in."
    />
  );
}
