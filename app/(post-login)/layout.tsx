import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";

// Layout for authenticated routes that pre-onboarding users can still hit
// (onboarding itself, and the suspended-account message). Profile may be
// missing or incomplete here, so we don't gate on it — individual pages do.
export const dynamic = "force-dynamic";

export default async function PostLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-base font-semibold tracking-tight">
            Sublets
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-black/5 hover:text-[var(--foreground)]"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </>
  );
}
