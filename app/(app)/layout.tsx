import { AppBottomTabs, AppTopBar } from "@/components/AppNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppTopBar />
      <main className="flex-1 pb-16 sm:pb-0">{children}</main>
      <AppBottomTabs />
    </>
  );
}
