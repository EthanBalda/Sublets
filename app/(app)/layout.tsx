import { AppBottomTabs, AppTopBar } from "@/components/AppNav";
import { requireOnboardedUser } from "@/lib/auth/session";

// Gated routes vary per user — never prerender them.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardedUser();

  return (
    <>
      <AppTopBar />
      <main className="flex-1 pb-16 sm:pb-0">{children}</main>
      <AppBottomTabs />
    </>
  );
}
