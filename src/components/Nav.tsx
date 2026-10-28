"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Garage", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/friends/", label: "Friends", icon: "M16 11a4 4 0 1 0-8 0M4 20a8 8 0 0 1 16 0M19 8a3 3 0 0 1 0 6" },
  { href: "/cars/", label: "Cars", icon: "M3 16l2-6.5A2 2 0 0 1 6.9 8h10.2a2 2 0 0 1 1.9 1.5L21 16v3H3zM3 16h18M6.5 19v1.5M17.5 19v1.5" },
  { href: "/account/", label: "Account", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" },
];

function useActive() {
  const path = usePathname();
  return (href: string) => {
    if (href === "/") return path === "/" || path.startsWith("/card");
    if (href === "/cars/") return path.startsWith("/cars") || path.startsWith("/car/");
    if (href === "/friends/") return path.startsWith("/friends") || path.startsWith("/ranks");
    return path.startsWith(href.slice(0, -1));
  };
}

function Mark() {
  // A wheel seen side-on: the product's mark.
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke="#f5a524" strokeWidth="3" />
      <circle cx="12" cy="12" r="3" fill="#f5a524" />
      <path d="M12 2v7M12 15v7M2 12h7M15 12h7" stroke="#f5a524" strokeWidth="1.6" />
    </svg>
  );
}

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

export default function Nav() {
  const active = useActive();
  const path = usePathname();
  if (path.startsWith("/spot")) return null; // the camera takes the whole screen

  return (
    <>
      {/* Desktop and tablet: a plain top bar on the ground. */}
      <header className="sticky top-0 z-40 hidden bg-bg md:block">
        <div className="mx-auto flex h-12 max-w-[1120px] items-center gap-8 px-6">
          <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold">
            <Mark /> Torquest
          </Link>
          <nav className="flex gap-6">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={`text-[14px] font-semibold ${active(l.href) ? "text-ink" : "text-[#bbbbbb]"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <Link href="/spot/" className="ml-auto flex h-9 items-center rounded-full bg-white px-4 text-[14px] font-semibold text-black">
            Spot a car
          </Link>
        </div>
      </header>

      {/* Phone: four destinations and the camera in the middle. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 bg-bg pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="flex items-center justify-around px-2 pt-1.5">
          {[LINKS[0], LINKS[1], null, LINKS[2], LINKS[3]].map((l) =>
            l ? (
              <li key={l.href}>
                <Link href={l.href} className={`flex w-16 flex-col items-center gap-0.5 pb-1.5 text-[11px] ${active(l.href) ? "text-ink" : "text-[#bbbbbb]"}`}>
                  <Icon d={l.icon} />
                  {l.label}
                </Link>
              </li>
            ) : (
              <li key="spot">
                <Link href="/spot/" aria-label="Spot a car" className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black active:scale-95">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                </Link>
              </li>
            ),
          )}
        </ul>
      </nav>
    </>
  );
}
