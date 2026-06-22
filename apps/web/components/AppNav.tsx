"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

const tabs: NavItem[] = [
  { href: "/explore", label: "Explore" },
  { href: "/saved", label: "Saved" },
  { href: "/listings/new", label: "Post" },
  { href: "/messages", label: "Messages" },
  { href: "/dashboard", label: "Account" },
];

function isActive(pathname: string, href: string) {
  if (href === "/explore") return pathname === "/explore";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppTopBar() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/explore" className="text-base font-semibold tracking-tight">
          Sublets
        </Link>
        <nav className="hidden items-center gap-1 text-sm sm:flex">
          {tabs.map((tab) => (
            <DesktopNavLink key={tab.href} {...tab} />
          ))}
        </nav>
      </div>
    </header>
  );
}

function DesktopNavLink({ href, label }: NavItem) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-black/5 px-3 py-1.5 font-medium text-[var(--foreground)]"
          : "rounded-full px-3 py-1.5 text-[var(--muted)] hover:bg-black/5 hover:text-[var(--foreground)]"
      }
    >
      {label}
    </Link>
  );
}

export function AppBottomTabs() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 w-full border-t border-[var(--border)] bg-[var(--background)]/95 backdrop-blur sm:hidden">
      <ul className="mx-auto flex w-full max-w-5xl items-stretch justify-between px-2 py-1.5 text-xs">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={
                  active
                    ? "flex flex-col items-center gap-0.5 rounded-md px-2 py-1.5 font-medium text-[var(--foreground)]"
                    : "flex flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[var(--muted)]"
                }
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
