import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return (
    <PlaceholderPage
      title={`Conversation ${conversationId}`}
      description="The thread view ships in a later milestone. Conversations are tied to a listing and stay inside the platform."
    />
  );
}
