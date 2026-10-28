"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Garage", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/friends/", label: "Friends", icon: "M16 11a4 4 0 1 0-8 0M4 20a8 8 0 0 1 16 0M19 8a3 3 0 0 1 0 6" },
  { href: "/spot/", label: "Spot", icon: "" },
  { href: "/ranks/", label: "Ranks", icon: "M6 20V10M12 20V4M18 20v-7" },
  { href: "/profile/", label: "Profile", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" },
];

export default function BottomNav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/card") : path.startsWith(href.slice(0, -1)));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-md items-end justify-around px-2 pt-2 sm:max-w-2xl">
        {TABS.map((t) =>
          t.label === "Spot" ? (
            <li key={t.href} className="-mt-7">
              <Link
                href={t.href}
                aria-label="Spot a car"
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-bg bg-accent text-accent-ink shadow-[0_0_24px_rgb(245_165_36/0.35)]"
              >
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              </Link>
            </li>
          ) : (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex w-16 flex-col items-center gap-1 pb-2 text-[11px] font-medium ${active(t.href) ? "text-accent" : "text-muted"}`}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={t.icon} />
                </svg>
                {t.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
